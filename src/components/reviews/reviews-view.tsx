'use client'

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
        topic: searchParams.get('topic') ?? undefined,
        sentiment: searchParams.get('sentiment') ?? undefined,
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
    }

    const filterKey = {
        propertySlug: params.property,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        topic: params.topic as ReviewTopicKey | undefined,
        sentiment: params.sentiment as ReviewSentiment | undefined,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        limit: 50,
    }

    const propertiesQuery = usePropertiesListQuery()
    const reviewsQuery = useReviewsQuery(filterKey)

    const isLoading = propertiesQuery.isLoading || reviewsQuery.isLoading
    const isError = propertiesQuery.isError || reviewsQuery.isError
    const error = propertiesQuery.error ?? reviewsQuery.error
    const reviews = reviewsQuery.data?.pages.flatMap((page) => page.items) ?? []

    const refetchAll = () => {
        void propertiesQuery.refetch()
        void reviewsQuery.refetch()
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm text-muted-foreground">Filter and inspect collected Booking.com reviews</p>
            </div>

            {propertiesQuery.data ? <ReviewFiltersForm properties={propertiesQuery.data} params={params} /> : null}

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

                        {reviewsQuery.hasNextPage ? (
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    disabled={reviewsQuery.isFetchingNextPage}
                                    onClick={() => reviewsQuery.fetchNextPage()}
                                >
                                    {reviewsQuery.isFetchingNextPage ? 'Loading...' : 'Load more reviews'}
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </QueryState>
        </div>
    )
}
