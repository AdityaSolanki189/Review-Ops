import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ReviewFilters } from '@/db/queries/analytics'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

export type ReviewsPage = Awaited<ReturnType<typeof import('@/db/queries/analytics').getRecentReviews>>
export type ReviewListItem = ReviewsPage['items'][number]

function buildReviewsSearchParams(filters: ReviewFilters): string {
    const params = new URLSearchParams()

    if (filters.propertySlug) params.set('property', filters.propertySlug)
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
    if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating))
    if (filters.topic) params.set('topic', filters.topic)
    if (filters.sentiment) params.set('sentiment', filters.sentiment)
    if (filters.from) params.set('from', filters.from.toISOString())
    if (filters.to) params.set('to', filters.to.toISOString())
    if (filters.cursor) params.set('cursor', filters.cursor)
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))

    const query = params.toString()
    return query ? `?${query}` : ''
}

async function fetchReviews(filters: ReviewFilters): Promise<ReviewsPage> {
    return fetchJson(`/api/reviews${buildReviewsSearchParams(filters)}`)
}

export function useReviewsQuery(filters: Omit<ReviewFilters, 'cursor'>) {
    return useInfiniteQuery({
        queryKey: queryKeys.reviews.list(filters),
        queryFn: ({ pageParam }) => fetchReviews({ ...filters, cursor: pageParam }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })
}

export function useReviewQuery(reviewId: string | null) {
    return useQuery({
        queryKey: ['review', reviewId],
        queryFn: () => fetchJson<ReviewListItem>(`/api/reviews/${reviewId}`),
        enabled: Boolean(reviewId),
    })
}
