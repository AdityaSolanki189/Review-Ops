import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews, reviewTopics, scrapeRuns, type Property } from '@/db/schema'
import { invalidateCache } from '@/lib/cache/cached'
import { classifyReview } from '@/lib/classification/topics'
import { buildExternalId, buildReviewFingerprint } from '@/lib/deduplicate'
import type { ScrapedReview } from '@/lib/validations/review'

type ReviewValues = {
    propertyId: string
    source: 'booking'
    externalId: string | null
    fingerprint: string
    rating: string
    title: string | null
    positiveText: string | null
    negativeText: string | null
    reviewDate: Date
    stayDate: Date | null
    reviewerName: string | null
    reviewerCountry: string | null
    roomType: string | null
    travellerType: string | null
    scrapedAt: Date
}

type TopicValues = {
    reviewId: string
    topic: ReturnType<typeof classifyReview>[number]['topic']
    sentiment: ReturnType<typeof classifyReview>[number]['sentiment']
    confidence: string
}

type PersistedReview = ReviewValues & { id: string }

export interface ReviewPersistenceAdapter {
    transaction<T>(work: (transaction: ReviewPersistenceAdapter) => Promise<T>): Promise<T>
    findByExternalId(externalId: string): Promise<PersistedReview | null>
    findByFingerprint(fingerprint: string): Promise<PersistedReview | null>
    insertReview(values: ReviewValues): Promise<PersistedReview>
    updateReview(id: string, values: ReviewValues): Promise<PersistedReview>
    deleteTopics(reviewId: string): Promise<void>
    insertTopics(topics: TopicValues[]): Promise<void>
}

export type ReviewPersistenceResult =
    | { kind: 'inserted'; reviewId: string }
    | { kind: 'updated'; reviewId: string }
    | { kind: 'duplicate'; reviewId: string }

function buildReviewValues(property: Property, scraped: ScrapedReview): ReviewValues {
    const fingerprint = buildReviewFingerprint({
        propertyId: property.id,
        reviewerName: scraped.reviewerName,
        reviewDate: scraped.reviewDate,
        rating: String(scraped.rating),
        positiveText: scraped.positiveText,
        negativeText: scraped.negativeText,
    })

    const externalId = scraped.externalId ? buildExternalId(property.bookingPropertyId, scraped.externalId) : null

    return {
        propertyId: property.id,
        source: 'booking',
        externalId,
        fingerprint,
        rating: String(scraped.rating),
        title: scraped.title ?? null,
        positiveText: scraped.positiveText ?? null,
        negativeText: scraped.negativeText ?? null,
        reviewDate: scraped.reviewDate,
        stayDate: scraped.stayDate ?? null,
        reviewerName: scraped.reviewerName ?? null,
        reviewerCountry: scraped.reviewerCountry ?? null,
        roomType: scraped.roomType ?? null,
        travellerType: scraped.travellerType ?? null,
        scrapedAt: new Date(),
    }
}

export async function persistReview(
    adapter: ReviewPersistenceAdapter,
    property: Property,
    scraped: ScrapedReview,
): Promise<ReviewPersistenceResult> {
    const values = buildReviewValues(property, scraped)

    return adapter.transaction(async (transaction) => {
        const stableExisting = values.externalId ? await transaction.findByExternalId(values.externalId) : null
        const fingerprintExisting = await transaction.findByFingerprint(values.fingerprint)
        const existing = stableExisting ?? fingerprintExisting
        if (existing && existing.fingerprint === values.fingerprint) return { kind: 'duplicate', reviewId: existing.id }

        const persisted = existing
            ? await transaction.updateReview(existing.id, values)
            : await transaction.insertReview(values)
        const topics = classifyReview({
            rating: scraped.rating,
            title: scraped.title,
            positiveText: scraped.positiveText,
            negativeText: scraped.negativeText,
        })
        await transaction.deleteTopics(persisted.id)
        if (topics.length > 0) {
            await transaction.insertTopics(
                topics.map((topic) => ({ ...topic, reviewId: persisted.id, confidence: String(topic.confidence) })),
            )
        }
        return existing ? { kind: 'updated', reviewId: persisted.id } : { kind: 'inserted', reviewId: persisted.id }
    })
}

function createDbAdapter(database: typeof db): ReviewPersistenceAdapter {
    return {
        transaction: (work) =>
            database.transaction((transaction) => work(createDbAdapter(transaction as unknown as typeof db))),
        async findByExternalId(externalId) {
            const [review] = await database.select().from(reviews).where(eq(reviews.externalId, externalId)).limit(1)
            return review ?? null
        },
        async findByFingerprint(fingerprint) {
            const [review] = await database.select().from(reviews).where(eq(reviews.fingerprint, fingerprint)).limit(1)
            return review ?? null
        },
        async insertReview(values) {
            const [review] = await database.insert(reviews).values(values).returning()
            if (!review) throw new Error('Review insert did not return a row')
            return review
        },
        async updateReview(id, values) {
            const [review] = await database.update(reviews).set(values).where(eq(reviews.id, id)).returning()
            if (!review) throw new Error('Review update did not return a row')
            return review
        },
        async deleteTopics(reviewId) {
            await database.delete(reviewTopics).where(eq(reviewTopics.reviewId, reviewId))
        },
        async insertTopics(topics) {
            await database.insert(reviewTopics).values(topics)
        },
    }
}

export async function insertReview(property: Property, scraped: ScrapedReview): Promise<ReviewPersistenceResult> {
    return persistReview(createDbAdapter(db), property, scraped)
}

export async function createScrapeRun(propertyId: string) {
    const [run] = await db
        .insert(scrapeRuns)
        .values({
            propertyId,
            status: 'running',
            startedAt: new Date(),
        })
        .returning()

    return run
}

export async function finishScrapeRun(
    runId: string,
    data: {
        status: 'success' | 'partial' | 'failed' | 'blocked'
        reviewsFound: number
        reviewsInserted: number
        reviewsUpdated: number
        attemptCount: number
        errorMessage?: string
        newestReviewAt?: Date | null
    },
) {
    await db
        .update(scrapeRuns)
        .set({
            status: data.status,
            finishedAt: new Date(),
            reviewsFound: String(data.reviewsFound),
            reviewsInserted: String(data.reviewsInserted),
            reviewsUpdated: String(data.reviewsUpdated),
            attemptCount: String(data.attemptCount),
            errorMessage: data.errorMessage ?? null,
            newestReviewAt: data.newestReviewAt ?? null,
        })
        .where(eq(scrapeRuns.id, runId))

    await invalidateCache()
}
