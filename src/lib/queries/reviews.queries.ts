import { useQuery } from '@tanstack/react-query'
import type { ReviewFilters } from '@/db/queries/analytics'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

type ReviewsList = Awaited<ReturnType<typeof import('@/db/queries/analytics').getRecentReviews>>

function buildReviewsSearchParams(filters: ReviewFilters): string {
    const params = new URLSearchParams()

    if (filters.propertySlug) params.set('property', filters.propertySlug)
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
    if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating))
    if (filters.topic) params.set('topic', filters.topic)
    if (filters.sentiment) params.set('sentiment', filters.sentiment)
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))

    const query = params.toString()
    return query ? `?${query}` : ''
}

async function fetchReviews(filters: ReviewFilters): Promise<ReviewsList> {
    return fetchJson(`/api/reviews${buildReviewsSearchParams(filters)}`)
}

export function useReviewsQuery(filters: ReviewFilters) {
    return useQuery({
        queryKey: queryKeys.reviews.list(filters),
        queryFn: () => fetchReviews(filters),
    })
}
