'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { ReviewFiltersForm } from '@/components/reviews/review-filters-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'
import { useReviewsQuery } from '@/lib/queries/reviews.queries'

export function ReviewsView() {
    const searchParams = useSearchParams()

    const params = {
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

    const propertiesQuery = usePropertiesListQuery()
    const reviewsQuery = useReviewsQuery(filterKey)

    const isLoading = propertiesQuery.isLoading || reviewsQuery.isLoading
    const isError = propertiesQuery.isError || reviewsQuery.isError
    const error = propertiesQuery.error ?? reviewsQuery.error
    const [pagination, setPagination] = useState({ filterSearch: '', pageIndex: 0 })
    const filterSearch = searchParams.toString()
    const pageIndex = pagination.filterSearch === filterSearch ? pagination.pageIndex : 0
    const pages = reviewsQuery.data?.pages ?? []
    const reviews = pages[pageIndex]?.items ?? []
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
        void reviewsQuery.refetch()
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm text-muted-foreground">Browse and filter individual guest reviews</p>
            </div>

            {propertiesQuery.data ? <ReviewFiltersForm properties={propertiesQuery.data} params={params} /> : null}

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

            {!isLoading && reviewsQuery.data ? (
                <p className="text-sm font-medium">
                    {reviews.length === 0 && pages.length === 0
                        ? '0 reviews found'
                        : `${pages.reduce((sum, page) => sum + page.items.length, 0) || reviews.length} reviews on this page`}
                    {activeFilters.length > 0 ? ' matching filters' : ''}
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
                {reviewsQuery.data ? (
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
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        propertyName={review.property.name}
                                        rating={review.rating}
                                        title={review.title}
                                        excerpt={review.negativeText ?? review.positiveText}
                                        reviewDate={review.reviewDate}
                                        topics={review.topics}
                                    />
                                ))
                            )}
                        </div>

                        {pages.length > 0 ? (
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
