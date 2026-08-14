import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { persistReview, type ReviewPersistenceAdapter } from '../deduplicate'
import { isReclassificationEligible } from '@/lib/reclassification'

const property = {
    id: 'property-1',
    bookingPropertyId: 'booking-property-1',
} as never

const scraped = {
    externalId: 'review-1',
    rating: 4,
    title: 'Noisy room',
    negativeText: 'The noise made sleep difficult.',
    reviewDate: new Date('2026-02-01T00:00:00.000Z'),
}

type StoredReview = Awaited<ReturnType<ReviewPersistenceAdapter['insertReview']>> & {
    classifierVersion?: number
    classifiedAt?: Date
}
type StoredTopic = Parameters<ReviewPersistenceAdapter['insertTopics']>[0][number]

function createMemoryAdapter(
    options: { failTopicInsert?: boolean } = {},
): ReviewPersistenceAdapter & { reviews: Map<string, StoredReview>; topics: StoredTopic[] } {
    const state = { reviews: new Map<string, StoredReview>(), topics: [] as StoredTopic[] }
    const adapter: ReviewPersistenceAdapter & typeof state = {
        ...state,
        async transaction(work) {
            const reviewSnapshot = structuredClone([...state.reviews.entries()])
            const topicSnapshot = structuredClone(state.topics)
            try {
                return await work(adapter)
            } catch (error) {
                state.reviews = new Map(reviewSnapshot)
                state.topics = topicSnapshot
                adapter.reviews = state.reviews
                adapter.topics = state.topics
                throw error
            }
        },
        async findByExternalId(externalId) {
            return [...state.reviews.values()].find((review) => review.externalId === externalId) ?? null
        },
        async findByFingerprint(fingerprint) {
            return [...state.reviews.values()].find((review) => review.fingerprint === fingerprint) ?? null
        },
        async insertReview(values) {
            const review = { id: `review-${state.reviews.size + 1}`, ...values }
            state.reviews.set(review.id, review)
            return review
        },
        async updateReview(id, values) {
            const review = { ...state.reviews.get(id), ...values, id }
            state.reviews.set(id, review)
            return review
        },
        async deleteTopics(reviewId) {
            state.topics = state.topics.filter((topic) => topic.reviewId !== reviewId)
            adapter.topics = state.topics
        },
        async insertTopics(topics) {
            if (options.failTopicInsert) throw new Error('topic persistence failed')
            state.topics.push(...topics)
            adapter.topics = state.topics
        },
        async updateClassifierMetadata(reviewId, metadata) {
            const review = state.reviews.get(reviewId)
            if (review) {
                state.reviews.set(reviewId, {
                    ...review,
                    classifierVersion: metadata.classifierVersion,
                    classifiedAt: metadata.classifiedAt,
                })
            }
        },
    }
    return adapter
}

describe('review persistence', () => {
    it('marks reviews with missing or outdated classifier versions as eligible', () => {
        assert.equal(isReclassificationEligible(0, null), true)
        assert.equal(isReclassificationEligible(3, 1), true)
        assert.equal(isReclassificationEligible(3, 2), false)
    })

    it('updates a source-qualified review and replaces its topic classification when the text changes', async () => {
        const adapter = createMemoryAdapter()
        const first = await persistReview(adapter, property, scraped)
        const second = await persistReview(adapter, property, {
            ...scraped,
            title: 'Dirty bathroom',
            negativeText: 'The bathroom was dirty.',
        })

        assert.equal(first.kind, 'inserted')
        assert.equal(second.kind, 'updated')
        assert.equal(adapter.reviews.size, 1)
        assert.deepEqual(adapter.topics.map((topic) => topic.topic).sort(), ['bathroom', 'cleanliness'].sort())
    })

    it('reports an unchanged stable external ID as a duplicate', async () => {
        const adapter = createMemoryAdapter()
        await persistReview(adapter, property, scraped)

        const result = await persistReview(adapter, property, scraped)

        assert.deepEqual(result, { kind: 'duplicate', reviewId: 'review-1' })
    })

    it('rolls the review write back when topic persistence fails', async () => {
        const adapter = createMemoryAdapter({ failTopicInsert: true })

        await assert.rejects(() => persistReview(adapter, property, scraped), /topic persistence failed/)

        assert.equal(adapter.reviews.size, 0)
        assert.deepEqual(adapter.topics, [])
    })
})
