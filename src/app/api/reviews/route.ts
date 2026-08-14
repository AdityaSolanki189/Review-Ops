import { NextResponse } from 'next/server'
import { getRecentReviews, type ReviewFilters } from '@/db/queries/analytics'
import { parseReviewFilters, type ParsedReviewFilters } from '@/lib/reviews'

type ReviewsFetcher = (filters: ReviewFilters & ParsedReviewFilters) => Promise<unknown>

export function createReviewsRoute(fetchReviews: ReviewsFetcher = getRecentReviews) {
    return async function GET(request: Request) {
        const parsed = parseReviewFilters(new URL(request.url).searchParams)
        if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

        return NextResponse.json(await fetchReviews(parsed.data))
    }
}

export const GET = createReviewsRoute()
