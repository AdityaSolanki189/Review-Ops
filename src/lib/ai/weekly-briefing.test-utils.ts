import { buildDeterministicBriefing, type PortfolioBriefingResult } from '@/lib/ai/weekly-briefing'

function createOverviewFixture(reviewCount = 20) {
    return {
        scope: {
            from: '2025-06-01',
            to: '2025-07-01',
            compare: 'previous-period' as const,
            timezone: 'Australia/Sydney' as const,
        },
        averageRating: {
            value: 6.5,
            previousValue: 6.8,
            delta: -0.3,
            sampleSize: reviewCount,
            status: 'available' as const,
        },
        reviewActivity: {
            value: reviewCount,
            previousValue: 18,
            delta: reviewCount - 18,
            sampleSize: reviewCount,
            status: reviewCount >= 5 ? ('available' as const) : ('insufficient_data' as const),
        },
        lowScoreRate: {
            value: 25,
            previousValue: 20,
            delta: 5,
            sampleSize: reviewCount,
            status: 'available' as const,
        },
        topNegativeTopic: {
            topic: 'cleanliness' as const,
            negativeMentionRate: 18,
            previousMentionRate: 10,
            momentumPercentagePoints: 8,
            negativeReviewShare: 50,
            sampleSize: reviewCount,
            status: 'available' as const,
        },
        topPositiveTopic: {
            topic: 'location' as const,
            positiveMentionRate: 42,
            previousMentionRate: 35,
            momentumPercentagePoints: 7,
            sampleSize: reviewCount,
            status: 'available' as const,
        },
        freshness: {
            latestReviewAt: '2025-06-30T00:00:00.000Z',
            latestScrapedAt: '2025-07-01T00:00:00.000Z',
            sources: ['booking'],
        },
        classificationCoverage: {
            value: 80,
            previousValue: 75,
            delta: 5,
            sampleSize: reviewCount,
            status: 'available' as const,
        },
        sentimentMix: { positive: 40, neutral: 10, negative: 20 },
        positiveDrivers: [
            {
                topic: 'location' as const,
                mentionCount: 8,
                positiveMentionRate: 42,
                momentumPercentagePoints: 7,
                status: 'available' as const,
            },
        ],
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
                classificationCoverage: 75,
                sentimentMix: { positive: 20, neutral: 5, negative: 8 },
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
                classificationCoverage: 83,
                sentimentMix: { positive: 20, neutral: 5, negative: 12 },
            },
        ],
    }
}

const issuesFixture = {
    scope: createOverviewFixture().scope,
    issues: [
        {
            propertySlug: 'central-sydney',
            topic: 'cleanliness' as const,
            negativeMentionRate: 30,
            negativeReviewShare: 50,
            portfolioNegativeShare: 30,
            previousMentionRate: 10,
            momentumPercentagePoints: 8,
            ratingGap: -1.2,
            sampleSize: 6,
            latestReviewAt: null,
            status: 'available' as const,
        },
    ],
}

export function buildDeterministicBriefingForTest(input?: { reviewCount?: number }): PortfolioBriefingResult {
    const reviewCount = input?.reviewCount ?? 20
    return buildDeterministicBriefing(createOverviewFixture(reviewCount), {
        ...issuesFixture,
        issues: reviewCount === 0 ? [] : issuesFixture.issues,
    })
}
