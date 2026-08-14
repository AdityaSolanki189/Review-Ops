import { NextResponse } from 'next/server'
import { getRecentReviews, type ReviewFilters } from '@/db/queries/analytics'
import { parseReviewFilters, type ParsedReviewFilters } from '@/lib/reviews'

type ReviewsFetcher = (filters: ReviewFilters & ParsedReviewFilters) => Promise<unknown>

export function createReviewsRoute(fetchReviews: ReviewsFetcher = getRecentReviews) {
    return async function GET(request: Request) {
        const parsed = parseReviewFilters(new URL(request.url).searchParams)
        if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

        try {
            return NextResponse.json(await fetchReviews(parsed.data))
        } catch (error) {
            console.error('[reviews] route loader failed:', error)
            const message = error instanceof Error ? error.message : 'Failed to load reviews.'
            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}

export const GET = createReviewsRoute()
