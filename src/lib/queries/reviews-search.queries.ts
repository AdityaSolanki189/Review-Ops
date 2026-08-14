import { useQuery } from '@tanstack/react-query'
import type { ReviewFilters } from '@/db/queries/analytics'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

export interface ReviewSearchFilters extends Omit<ReviewFilters, 'cursor' | 'representative' | 'sort'> {
    q: string
}

export interface ReviewSearchItem {
    id: string
    rating: string
    title: string | null
    positiveText: string | null
    negativeText: string | null
    reviewDate: Date
    property: { name: string; slug: string }
    topics: Array<{ topic: string; sentiment: string; confidence: string }>
    similarity: number | null
}

export interface ReviewSearchResponse {
    mode: 'semantic' | 'keyword'
    items: ReviewSearchItem[]
}

function buildReviewSearchParams(filters: ReviewSearchFilters): string {
    const params = new URLSearchParams()
    params.set('q', filters.q)
    if (filters.propertySlug) params.set('property', filters.propertySlug)
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
    if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating))
    if (filters.topic) params.set('topic', filters.topic)
    if (filters.sentiment) params.set('sentiment', filters.sentiment)
    if (filters.ratingBand) params.set('ratingBand', filters.ratingBand)
    if (filters.from) params.set('from', filters.from.toISOString().slice(0, 10))
    if (filters.to) params.set('to', filters.to.toISOString().slice(0, 10))
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))
    return `?${params.toString()}`
}

async function fetchReviewSearch(filters: ReviewSearchFilters): Promise<ReviewSearchResponse> {
    return fetchJson(`/api/reviews/search${buildReviewSearchParams(filters)}`)
}

export function useReviewSearchQuery(filters: ReviewSearchFilters | null) {
    return useQuery({
        queryKey: queryKeys.reviews.search({ ...(filters ?? {}) }),
        queryFn: () => fetchReviewSearch(filters as ReviewSearchFilters),
        enabled: Boolean(filters?.q && filters.q.length >= 2),
    })
}
