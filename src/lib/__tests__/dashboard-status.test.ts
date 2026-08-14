import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    ANOMALY_MOMENTUM_THRESHOLD,
    buildPortfolioStatus,
    isAnomalyIssue,
    portfolioAverageRating,
    propertyVsPortfolioGap,
} from '@/lib/dashboard-status'
import type { IssueSignal } from '@/lib/analytics'

const overviewFixture = {
    averageRating: {
        value: 6.5,
        previousValue: 6.8,
        delta: -0.3,
        sampleSize: 20,
        status: 'available' as const,
    },
    reviewActivity: {
        value: 20,
        previousValue: 18,
        delta: 2,
        sampleSize: 20,
        status: 'available' as const,
    },
    lowScoreRate: {
        value: 25,
        previousValue: 20,
        delta: 5,
        sampleSize: 20,
        status: 'available' as const,
    },
    topNegativeTopic: {
        topic: 'cleanliness',
        negativeMentionRate: 18,
        momentumPercentagePoints: 4,
        status: 'available' as const,
        sampleSize: 20,
    },
    topPositiveTopic: {
        topic: 'location',
        positiveMentionRate: 42,
        status: 'available' as const,
        sampleSize: 20,
    },
    propertyComparison: [
        {
            property: { slug: 'olympic-paddington', name: 'Olympic Hotel Paddington' },
            averageRating: {
                value: 7.2,
                previousValue: 6.4,
                delta: 0.8,
                sampleSize: 8,
                status: 'available' as const,
            },
            reviewActivity: { value: 8, previousValue: 6, delta: 2, sampleSize: 8, status: 'available' as const },
            lowScoreRate: { value: 10, previousValue: 15, delta: -5, sampleSize: 8, status: 'available' as const },
        },
        {
            property: { slug: 'central-sydney', name: 'Central Sydney' },
            averageRating: {
                value: 5.7,
                previousValue: 6.6,
                delta: -0.9,
                sampleSize: 6,
                status: 'available' as const,
            },
            reviewActivity: { value: 6, previousValue: 7, delta: -1, sampleSize: 6, status: 'available' as const },
            lowScoreRate: { value: 40, previousValue: 25, delta: 15, sampleSize: 6, status: 'available' as const },
        },
    ],
}

describe('dashboard-status', () => {
    it('flags anomalies when momentum exceeds threshold with sufficient sample', () => {
        const issue: IssueSignal = {
            propertySlug: 'central-sydney',
            topic: 'cleanliness',
            negativeMentionRate: 30,
            previousMentionRate: 10,
            momentumPercentagePoints: ANOMALY_MOMENTUM_THRESHOLD,
            ratingGap: -1.2,
            sampleSize: 6,
            latestReviewAt: null,
            status: 'available',
        }

        assert.equal(isAnomalyIssue(issue), true)
    })

    it('builds portfolio status signals from overview and issues', () => {
        const signals = buildPortfolioStatus(overviewFixture, [
            {
                propertySlug: 'central-sydney',
                topic: 'cleanliness',
                negativeMentionRate: 30,
                previousMentionRate: 10,
                momentumPercentagePoints: 8,
                ratingGap: -1.2,
                sampleSize: 6,
                latestReviewAt: null,
                status: 'available',
            },
        ])

        assert.ok(signals.some((signal) => signal.kind === 'overall'))
        assert.ok(signals.some((signal) => signal.kind === 'improvement' && signal.value.includes('Olympic')))
        assert.ok(signals.some((signal) => signal.kind === 'attention' && signal.value.includes('Central')))
        assert.ok(signals.some((signal) => signal.kind === 'anomaly'))
    })

    it('computes weighted portfolio average and property gap', () => {
        const average = portfolioAverageRating(overviewFixture.propertyComparison)
        assert.ok(average !== null)
        const gap = propertyVsPortfolioGap(5.7, average)
        assert.ok(gap !== null && gap < 0)
    })

    it('returns insufficient overall signal when there are no reviews', () => {
        const signals = buildPortfolioStatus(
            {
                ...overviewFixture,
                reviewActivity: { value: 0, previousValue: 0, delta: null, sampleSize: 0, status: 'insufficient_data' },
            },
            [],
        )
        assert.equal(signals[0]?.value, 'No reviews')
    })
})
