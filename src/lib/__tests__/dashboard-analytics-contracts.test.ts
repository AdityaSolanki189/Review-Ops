import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapIssueSignals, mapOverviewResponse, mapTopicMatrixResponse } from '@/lib/dashboard-analytics'
import { resolveAnalyticsScope } from '@/lib/analytics'

const scope = resolveAnalyticsScope({
    from: '2025-06-01',
    to: '2025-07-01',
    compare: 'previous-period',
    timezone: 'Australia/Sydney',
})

describe('mapIssueSignals', () => {
    it('uses the selected portfolio average for rating gap and zero for an absent prior topic', () => {
        const issues = mapIssueSignals({
            scope,
            scopeAverageRating: 8,
            currentIssues: [
                {
                    slug: 'central-sydney',
                    topic: 'noise',
                    reviewCount: 2,
                    averageRating: 5,
                    latestReviewAt: new Date('2025-06-20T00:00:00.000Z'),
                },
            ],
            previousIssues: [],
            currentProperties: [{ slug: 'central-sydney', reviewCount: 10 }],
            previousProperties: [{ slug: 'central-sydney', reviewCount: 10 }],
        })

        assert.deepEqual(issues, [
            {
                propertySlug: 'central-sydney',
                topic: 'noise',
                negativeMentionRate: 20,
                previousMentionRate: 0,
                momentumPercentagePoints: 20,
                ratingGap: -3,
                sampleSize: 10,
                latestReviewAt: '2025-06-20T00:00:00.000Z',
                status: 'available',
            },
        ])
    })

    it('marks an empty previous period insufficient and suppresses momentum', () => {
        const [issue] = mapIssueSignals({
            scope,
            scopeAverageRating: 8,
            currentIssues: [
                {
                    slug: 'central-sydney',
                    topic: 'noise',
                    reviewCount: 2,
                    averageRating: 5,
                    latestReviewAt: null,
                },
            ],
            previousIssues: [],
            currentProperties: [{ slug: 'central-sydney', reviewCount: 10 }],
            previousProperties: [],
        })

        assert.equal(issue?.previousMentionRate, null)
        assert.equal(issue?.momentumPercentagePoints, null)
        assert.equal(issue?.status, 'insufficient_data')
    })
})

describe('mapOverviewResponse', () => {
    it('builds a successful overview contract with prior top-topic comparison and empty properties', () => {
        const result = mapOverviewResponse({
            scope,
            properties: [
                { slug: 'central-sydney', name: 'Central Sydney' },
                { slug: 'potts-point', name: 'Potts Point' },
            ],
            current: {
                averageRating: 8,
                reviewCount: 10,
                lowScoreCount: 2,
                latestReviewAt: new Date('2025-06-30T00:00:00.000Z'),
                latestScrapedAt: new Date('2025-07-01T00:00:00.000Z'),
                sources: ['booking'],
            },
            previous: {
                averageRating: 7,
                reviewCount: 10,
                lowScoreCount: 3,
                latestReviewAt: null,
                latestScrapedAt: null,
                sources: ['booking'],
            },
            classifiedCurrent: 8,
            classifiedPrevious: 6,
            currentTopics: [{ topic: 'noise', reviewCount: 2 }],
            previousTopics: [],
            propertyCurrent: [
                { slug: 'central-sydney', name: 'Central Sydney', averageRating: 8, reviewCount: 10, lowScoreCount: 2 },
            ],
            propertyPrevious: [
                { slug: 'central-sydney', name: 'Central Sydney', averageRating: 7, reviewCount: 10, lowScoreCount: 3 },
                { slug: 'potts-point', name: 'Potts Point', averageRating: 6, reviewCount: 7, lowScoreCount: 3 },
            ],
        })

        assert.deepEqual(result.scope, scope.public)
        assert.deepEqual(result.topNegativeTopic, {
            topic: 'noise',
            negativeMentionRate: 20,
            previousMentionRate: 0,
            momentumPercentagePoints: 20,
            negativeReviewShare: 100,
            sampleSize: 10,
            status: 'available',
        })
        assert.deepEqual(result.propertyComparison[1]?.averageRating, {
            value: null,
            previousValue: 6,
            delta: null,
            sampleSize: 0,
            status: 'insufficient_data',
        })
    })
})

describe('mapTopicMatrixResponse', () => {
    it('reports overall property classification coverage instead of topic incidence', () => {
        const result = mapTopicMatrixResponse({
            scope,
            properties: [{ slug: 'central-sydney', name: 'Central Sydney' }],
            totals: [{ slug: 'central-sydney', reviewCount: 4 }],
            classified: [{ slug: 'central-sydney', reviewCount: 2 }],
            topics: [{ slug: 'central-sydney', topic: 'noise', negativeReviewCount: 1 }],
        })

        assert.equal(result.rows[0]?.classificationCoverage, 50)
        assert.deepEqual(result.rows[0]?.cells.noise, {
            negativeMentionRate: 25,
            distinctReviewCount: 1,
        })
        assert.equal('coverage' in (result.rows[0]?.cells.noise ?? {}), false)
    })
})
