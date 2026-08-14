import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createReviewsRoute } from '@/app/api/reviews/route'
import { decodeReviewCursor, encodeReviewCursor, parseReviewFilters } from '@/lib/reviews'

describe('review drill-down contracts', () => {
    it('normalizes a date-only inclusive end date to the next Sydney calendar day', () => {
        const result = parseReviewFilters(
            new URLSearchParams({
                property: 'sydney-harbour-hotel',
                topic: 'noise',
                sentiment: 'negative',
                ratingBand: 'low',
                from: '2026-04-04',
                to: '2026-04-05',
                sort: 'rating-low',
                representative: 'true',
                limit: '25',
            }),
        )

        assert.equal(result.success, true)
        if (!result.success) return
        assert.deepEqual(result.data, {
            propertySlug: 'sydney-harbour-hotel',
            topic: 'noise',
            sentiment: 'negative',
            ratingBand: 'low',
            from: new Date('2026-04-03T13:00:00.000Z'),
            to: new Date('2026-04-05T14:00:00.000Z'),
            sort: 'rating-low',
            representative: true,
            limit: 25,
        })
    })

    it('rejects malformed enum, date, cursor, and limit values', () => {
        for (const params of [
            new URLSearchParams({ ratingBand: 'critical' }),
            new URLSearchParams({ from: '2026-02-30' }),
            new URLSearchParams({ cursor: 'not-a-review-cursor' }),
            new URLSearchParams({ limit: '101' }),
        ]) {
            const result = parseReviewFilters(params)
            assert.equal(result.success, false)
        }
    })

    it('treats empty optional form fields as absent filters', () => {
        const result = parseReviewFilters(
            new URLSearchParams({
                property: '',
                minRating: '',
                maxRating: '',
                topic: '',
                sentiment: '',
                from: '',
                to: '',
            }),
        )

        assert.equal(result.success, true)
        if (!result.success) return
        assert.deepEqual(result.data, { limit: 20, representative: false, sort: 'newest' })
    })

    it('binds each cursor to its selected primary sort and review identifier', () => {
        const cursor = encodeReviewCursor({ sort: 'rating-high', value: '9.5', id: 'review-42' })

        assert.deepEqual(decodeReviewCursor(cursor, 'rating-high'), {
            sort: 'rating-high',
            value: '9.5',
            id: 'review-42',
        })
        assert.equal(decodeReviewCursor(cursor, 'newest'), null)
    })

    it('returns a 400 response before querying for invalid request parameters', async () => {
        let calls = 0
        const handler = createReviewsRoute(async () => {
            calls += 1
            return { items: [], nextCursor: null, filters: {} }
        })

        const response = await handler(new Request('http://localhost/api/reviews?sort=surprise'))

        assert.equal(response.status, 400)
        assert.equal(calls, 0)
    })

    it('returns a JSON 500 when the reviews loader throws', async () => {
        const handler = createReviewsRoute(async () => {
            throw new Error('Database query failed')
        })

        const response = await handler(
            new Request('http://localhost/api/reviews?property=central-sydney&representative=true'),
        )

        assert.equal(response.status, 500)
        assert.deepEqual(await response.json(), { error: 'Database query failed' })
    })
})
