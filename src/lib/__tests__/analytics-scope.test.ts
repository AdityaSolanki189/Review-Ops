import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    calculateRate,
    createMetric,
    getSeriesGranularity,
    getPreviousPeriod,
    parseAnalyticsScope,
    sydneyDateStartToUtc,
} from '@/lib/analytics'

describe('parseAnalyticsScope', () => {
    it('defaults to the latest 30 complete Sydney calendar days', () => {
        const result = parseAnalyticsScope(new URLSearchParams(), new Date('2025-06-15T02:00:00.000Z'))

        assert.equal(result.ok, true)
        if (!result.ok) return

        assert.equal(result.value.timezone, 'Australia/Sydney')
        assert.equal(result.value.property, null)
        assert.equal(result.value.from.toISOString(), '2025-05-15T14:00:00.000Z')
        assert.equal(result.value.to.toISOString(), '2025-06-14T14:00:00.000Z')
        assert.equal(result.value.previous.from.toISOString(), '2025-04-15T14:00:00.000Z')
        assert.equal(result.value.previous.to.toISOString(), '2025-05-15T14:00:00.000Z')
    })

    it('accepts a scoped half-open range and an equal previous period', () => {
        const result = parseAnalyticsScope(
            new URLSearchParams({
                property: 'central-sydney',
                from: '2025-10-05',
                to: '2025-10-12',
                compare: 'previous-period',
                timezone: 'Australia/Sydney',
            }),
        )

        assert.equal(result.ok, true)
        if (!result.ok) return

        assert.equal(result.value.from.toISOString(), '2025-10-04T14:00:00.000Z')
        assert.equal(result.value.to.toISOString(), '2025-10-11T13:00:00.000Z')
        assert.equal(result.value.previous.from.toISOString(), '2025-09-27T14:00:00.000Z')
        assert.equal(result.value.previous.to.toISOString(), '2025-10-04T14:00:00.000Z')
    })

    it('rejects invalid scope parameters', () => {
        const invalidScopes = [
            new URLSearchParams({ from: '2025-02-30', to: '2025-03-01' }),
            new URLSearchParams({ from: '2025-03-01', to: '2025-03-01' }),
            new URLSearchParams({ property: 'unknown-hotel' }),
            new URLSearchParams({ compare: 'year-over-year' }),
            new URLSearchParams({ timezone: 'UTC' }),
            new URLSearchParams({ from: '2020-01-01', to: '2026-01-01' }),
        ]

        for (const searchParams of invalidScopes) {
            const result = parseAnalyticsScope(searchParams)
            assert.equal(result.ok, false)
        }
    })
})

describe('Sydney date boundaries', () => {
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

    it('marks a zero-review metric as no data', () => {
        const metric = createMetric({ value: 0, previous: 0, sampleSize: 0, previousSampleSize: 0 })
        assert.equal(metric.status, 'no_data')
    })

    it('calculates percentage-point deltas only with enough samples in both periods', () => {
        const sufficient = createMetric({ value: 7.5, previous: 5, sampleSize: 8, previousSampleSize: 6 })
        assert.deepEqual(sufficient, {
            value: 7.5,
            previous: 5,
            delta: 2.5,
            status: 'ok',
            sampleSize: 8,
            previousSampleSize: 6,
        })

        const sparse = createMetric({ value: 7.5, previous: 5, sampleSize: 4, previousSampleSize: 6 })
        assert.equal(sparse.delta, null)
        assert.equal(sparse.status, 'insufficient_data')
    })

    it('counts distinct negative-topic reviews once', () => {
        assert.equal(calculateRate(new Set(['review-1', 'review-1', 'review-2']).size, 4), 50)
    })
})

describe('series contracts', () => {
    it('uses daily points for short scopes and weekly points for long scopes', () => {
        assert.equal(getSeriesGranularity(90), 'day')
        assert.equal(getSeriesGranularity(91), 'week')
    })
})
