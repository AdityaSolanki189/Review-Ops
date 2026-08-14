import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyReview } from '@/lib/classification/topics'
import { buildReviewFingerprint } from '@/lib/deduplicate'

describe('buildReviewFingerprint', () => {
    it('produces stable hashes for identical input', () => {
        const input = {
            propertyId: 'prop-1',
            reviewerName: 'Alex',
            reviewDate: new Date('2025-01-15'),
            rating: '8',
            positiveText: 'Great location',
            negativeText: 'Noisy hallway',
        }

        assert.equal(buildReviewFingerprint(input), buildReviewFingerprint(input))
    })
})

describe('classifyReview', () => {
    it('flags cleanliness on negative bathroom mentions', () => {
        const topics = classifyReview({
            rating: 4,
            negativeText: 'The bathroom was dirty and smelled bad',
        })

        assert.ok(topics.some((topic) => topic.topic === 'bathroom' && topic.sentiment === 'negative'))
        assert.ok(topics.some((topic) => topic.topic === 'smell' && topic.sentiment === 'negative'))
    })
})
