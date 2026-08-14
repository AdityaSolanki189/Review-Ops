'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { ReviewFiltersForm } from '@/components/reviews/review-filters-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'
import { useReviewsQuery, type ReviewListItem } from '@/lib/queries/reviews.queries'
import { useReviewSearchQuery } from '@/lib/queries/reviews-search.queries'

const EXAMPLE_QUERIES = [
    'guests complaining about bathrooms smelling bad',
    'late night check-in problems',
    'noisy rooms at night',
]

export function ReviewsView() {
    const searchParams = useSearchParams()
    const searchQuery = searchParams.get('q')?.trim() ?? ''

    const params = {
        q: searchQuery || undefined,
        property: searchParams.get('property') ?? undefined,
        minRating: searchParams.get('minRating') ?? undefined,
        maxRating: searchParams.get('maxRating') ?? undefined,
        ratingBand: searchParams.get('ratingBand') ?? undefined,
        topic: searchParams.get('topic') ?? undefined,
        sentiment: searchParams.get('sentiment') ?? undefined,
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
        sort: searchParams.get('sort') ?? undefined,
        representative: searchParams.get('representative') ?? undefined,
    }

    const filterKey = {
        propertySlug: params.property,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        ratingBand: params.ratingBand as 'low' | 'mid' | 'high' | undefined,
        topic: params.topic as ReviewTopicKey | undefined,
        sentiment: params.sentiment as ReviewSentiment | undefined,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        sort: (params.sort as 'newest' | 'oldest' | 'rating-high' | 'rating-low' | undefined) ?? 'newest',
        representative: params.representative === 'true',
        limit: 20,
    }

    const searchFilters = searchQuery
        ? {
              q: searchQuery,
              propertySlug: filterKey.propertySlug,
              minRating: filterKey.minRating,
              maxRating: filterKey.maxRating,
              ratingBand: filterKey.ratingBand,
              topic: filterKey.topic,
              sentiment: filterKey.sentiment,
              from: filterKey.from,
              to: filterKey.to,
              limit: 20,
          }
        : null

    const propertiesQuery = usePropertiesListQuery()
    const reviewsQuery = useReviewsQuery(filterKey)
    const searchQueryResult = useReviewSearchQuery(searchFilters)

    const isSearchMode = Boolean(searchQuery)
    const isLoading = propertiesQuery.isLoading || (isSearchMode ? searchQueryResult.isLoading : reviewsQuery.isLoading)
    const isError = propertiesQuery.isError || (isSearchMode ? searchQueryResult.isError : reviewsQuery.isError)
    const error = propertiesQuery.error ?? (isSearchMode ? searchQueryResult.error : reviewsQuery.error)
    const [pagination, setPagination] = useState({ filterSearch: '', pageIndex: 0 })
    const filterSearch = searchParams.toString()
    const pageIndex = pagination.filterSearch === filterSearch ? pagination.pageIndex : 0
    const pages = reviewsQuery.data?.pages ?? []
    const listReviews = pages[pageIndex]?.items ?? []
    const searchReviews = searchQueryResult.data?.items ?? []
    const reviews: Array<ReviewListItem & { similarity?: number | null }> = isSearchMode
        ? (searchReviews as Array<ReviewListItem & { similarity?: number | null }>)
        : listReviews
    const activeFilters = [...searchParams.entries()].filter(
        ([key, value]) => value && key !== 'cursor' && !(key === 'sort' && value === 'newest'),
    )
    const withoutFilter = (key: string) => {
        const next = new URLSearchParams(searchParams)
        next.delete(key)
        const query = next.toString()
        return query ? `/reviews?${query}` : '/reviews'
    }

    const refetchAll = () => {
        void propertiesQuery.refetch()
        if (isSearchMode) void searchQueryResult.refetch()
        else void reviewsQuery.refetch()
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm text-muted-foreground">Browse, filter, or semantically search guest reviews</p>
            </div>

            {propertiesQuery.data ? <ReviewFiltersForm properties={propertiesQuery.data} params={params} /> : null}

            <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => {
                    const next = new URLSearchParams(searchParams)
                    next.set('q', example)
                    return (
                        <a
                            key={example}
                            href={`/reviews?${next.toString()}`}
                            className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs hover:bg-muted"
                        >
                            {example}
                        </a>
                    )
                })}
            </div>

            {activeFilters.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className="font-medium text-foreground">Active filters</span>
                    {activeFilters.map(([key, value]) => (
                        <a
                            key={key}
                            href={withoutFilter(key)}
                            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3 py-1.5 hover:bg-muted"
                        >
                            {key}: {value} ×
                        </a>
                    ))}
                    <a
                        href="/reviews"
                        className="inline-flex min-h-11 items-center px-2 text-primary underline-offset-4 hover:underline"
                    >
                        Clear all
                    </a>
                </div>
            ) : null}

            {isSearchMode && searchQueryResult.data ? (
                <Badge variant="outline">
                    {searchQueryResult.data.mode === 'semantic' ? 'Semantic search' : 'Keyword fallback'}
                </Badge>
            ) : null}

            {!isLoading && (isSearchMode ? searchQueryResult.data : reviewsQuery.data) ? (
                <p className="text-sm font-medium">
                    {reviews.length === 0
                        ? '0 reviews found'
                        : `${reviews.length} review${reviews.length === 1 ? '' : 's'}${isSearchMode ? ' matched' : ' on this page'}`}
                    {activeFilters.length > 0 ? ' with filters applied' : ''}
                </p>
            ) : null}

            <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetchAll}
                skeleton={
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                }
            >
                {(isSearchMode ? searchQueryResult.data : reviewsQuery.data) ? (
                    <>
                        <div className="grid gap-4">
                            {reviews.length === 0 ? (
                                <Card>
                                    <CardContent className="pt-6 text-sm text-muted-foreground">
                                        No reviews match these filters.
                                    </CardContent>
                                </Card>
                            ) : (
                                reviews.map((review) => (
                                    <div key={review.id} className="space-y-2">
                                        {'similarity' in review && review.similarity != null ? (
                                            <Badge variant="secondary" className="font-mono tabular-nums">
                                                {(review.similarity * 100).toFixed(0)}% match
                                            </Badge>
                                        ) : null}
                                        <ReviewCard
                                            review={review}
                                            propertyName={review.property.name}
                                            rating={review.rating}
                                            title={review.title}
                                            excerpt={review.negativeText ?? review.positiveText}
                                            reviewDate={review.reviewDate}
                                            topics={review.topics}
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        {!isSearchMode && pages.length > 0 ? (
                            <div className="flex justify-center gap-2">
                                <Button
                                    variant="outline"
                                    disabled={pageIndex === 0 || reviewsQuery.isFetchingNextPage}
                                    onClick={() =>
                                        setPagination({ filterSearch, pageIndex: Math.max(0, pageIndex - 1) })
                                    }
                                >
                                    Previous page
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={
                                        reviewsQuery.isFetchingNextPage ||
                                        (!pages[pageIndex + 1] && !reviewsQuery.hasNextPage)
                                    }
                                    onClick={() => {
                                        if (pages[pageIndex + 1]) {
                                            setPagination({ filterSearch, pageIndex: pageIndex + 1 })
                                            return
                                        }
                                        void reviewsQuery
                                            .fetchNextPage()
                                            .then(() => setPagination({ filterSearch, pageIndex: pageIndex + 1 }))
                                    }}
                                >
                                    {reviewsQuery.isFetchingNextPage ? 'Loading...' : 'Next page'}
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </QueryState>
        </div>
    )
}
