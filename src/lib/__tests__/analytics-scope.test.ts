import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    calculateRate,
    createMetric,
    getPreviousPeriod,
    getSeriesGranularity,
    parseAnalyticsScope,
    resolveAnalyticsScope,
    sydneyDateStartToUtc,
    type AnalyticsScope,
    type IssueSignal,
    type Metric,
} from '@/lib/analytics'

describe('parseAnalyticsScope', () => {
    it('returns the exact public contract for the latest 30 complete Sydney calendar days', () => {
        const result = parseAnalyticsScope(new URLSearchParams(), new Date('2025-06-15T02:00:00.000Z'))

        assert.deepEqual(result, {
            ok: true,
            value: {
                from: '2025-05-16',
                to: '2025-06-15',
                compare: 'previous-period',
                timezone: 'Australia/Sydney',
            } satisfies AnalyticsScope,
        })
    })

    it('keeps property validation out of the pure parser', () => {
        const result = parseAnalyticsScope(
            new URLSearchParams({ property: 'database-managed-hotel', from: '2025-01-01', to: '2025-02-01' }),
        )

        assert.equal(result.ok, true)
        if (!result.ok) return
        assert.equal(result.value.propertySlug, 'database-managed-hotel')
    })

    it('accepts explicit all-time ranges longer than 366 days', () => {
        const result = parseAnalyticsScope(new URLSearchParams({ from: '2018-01-01', to: '2026-01-01' }))
        assert.equal(result.ok, true)
    })

    it('rejects invalid or inverted scope parameters', () => {
        const invalidScopes = [
            new URLSearchParams({ from: '2025-02-30', to: '2025-03-01' }),
            new URLSearchParams({ from: '2025-03-01', to: '2025-03-01' }),
            new URLSearchParams({ from: '2025-03-02', to: '2025-03-01' }),
            new URLSearchParams({ compare: 'year-over-year' }),
            new URLSearchParams({ timezone: 'UTC' }),
        ]

        for (const searchParams of invalidScopes) {
            const result = parseAnalyticsScope(searchParams)
            assert.equal(result.ok, false)
        }
    })
})

describe('Sydney date boundaries', () => {
    it('resolves the public scope to half-open UTC boundaries and an equal previous period', () => {
        const resolved = resolveAnalyticsScope({
            propertySlug: 'central-sydney',
            from: '2025-10-05',
            to: '2025-10-12',
            compare: 'previous-period',
            timezone: 'Australia/Sydney',
        })

        assert.equal(resolved.from.toISOString(), '2025-10-04T14:00:00.000Z')
        assert.equal(resolved.to.toISOString(), '2025-10-11T13:00:00.000Z')
        assert.equal(resolved.previous.from.toISOString(), '2025-09-27T14:00:00.000Z')
        assert.equal(resolved.previous.to.toISOString(), '2025-10-04T14:00:00.000Z')
    })

    it('converts Sydney local midnight on both DST changes to UTC', () => {
        assert.equal(sydneyDateStartToUtc('2025-04-06').toISOString(), '2025-04-05T13:00:00.000Z')
        assert.equal(sydneyDateStartToUtc('2025-10-05').toISOString(), '2025-10-04T14:00:00.000Z')
    })

    it('calculates previous ranges with the same calendar-day span', () => {
        const current = {
            from: sydneyDateStartToUtc('2025-10-05'),
            to: sydneyDateStartToUtc('2025-10-12'),
        }

        const previous = getPreviousPeriod(current)
        assert.equal(previous.from.toISOString(), '2025-09-27T14:00:00.000Z')
        assert.equal(previous.to.toISOString(), current.from.toISOString())
    })
})

describe('metric formulas', () => {
    it('returns null rates when there is no denominator', () => {
        assert.equal(calculateRate(0, 0), null)
    })

    it('returns the exact available Metric contract with a delta', () => {
        const metric: Metric<number> = createMetric({
            value: 7.5,
            previousValue: 5,
            sampleSize: 8,
            previousSampleSize: 6,
        })

        assert.deepEqual(metric, {
            value: 7.5,
            previousValue: 5,
            delta: 2.5,
            sampleSize: 8,
            status: 'available',
        })
    })

    it('marks current data with an empty previous period as insufficient', () => {
        const metric = createMetric({ value: 7.5, previousValue: null, sampleSize: 8, previousSampleSize: 0 })
        assert.deepEqual(metric, {
            value: 7.5,
            previousValue: null,
            delta: null,
            sampleSize: 8,
            status: 'insufficient_data',
        })
    })

    it('marks sparse current or previous samples as insufficient', () => {
        const sparseCurrent = createMetric({ value: 7.5, previousValue: 5, sampleSize: 4, previousSampleSize: 6 })
        const sparsePrevious = createMetric({ value: 7.5, previousValue: 5, sampleSize: 6, previousSampleSize: 4 })

        assert.equal(sparseCurrent.delta, null)
        assert.equal(sparseCurrent.status, 'insufficient_data')
        assert.equal(sparsePrevious.delta, null)
        assert.equal(sparsePrevious.status, 'insufficient_data')
    })
})

describe('public issue contract', () => {
    it('uses the approved field names and serializable values', () => {
        const issue: IssueSignal = {
            propertySlug: 'central-sydney',
            topic: 'noise',
            negativeMentionRate: 20,
            negativeReviewShare: 40,
            portfolioNegativeShare: 20,
            previousMentionRate: 10,
            momentumPercentagePoints: 10,
            ratingGap: -2,
            sampleSize: 10,
            latestReviewAt: '2025-06-14T00:00:00.000Z',
            status: 'available',
        }

        assert.deepEqual(Object.keys(issue), [
            'propertySlug',
            'topic',
            'negativeMentionRate',
            'negativeReviewShare',
            'portfolioNegativeShare',
            'previousMentionRate',
            'momentumPercentagePoints',
            'ratingGap',
            'sampleSize',
            'latestReviewAt',
            'status',
        ])
    })
})

describe('series contracts', () => {
    it('uses daily points for short scopes and weekly points for long scopes', () => {
        assert.equal(getSeriesGranularity(90), 'day')
        assert.equal(getSeriesGranularity(91), 'week')
    })
})
