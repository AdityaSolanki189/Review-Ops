'use client'

import { useSearchParams } from 'next/navigation'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { ReviewFiltersForm } from '@/components/reviews/review-filters-form'
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
    }

    const propertiesQuery = usePropertiesListQuery()
    const reviewsQuery = useReviewsQuery({
        propertySlug: params.property,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        topic: params.topic as ReviewTopicKey | undefined,
        sentiment: params.sentiment as ReviewSentiment | undefined,
        limit: 50,
    })

    const isLoading = propertiesQuery.isLoading || reviewsQuery.isLoading
    const isError = propertiesQuery.isError || reviewsQuery.isError
    const error = propertiesQuery.error ?? reviewsQuery.error

    const refetchAll = () => {
        void propertiesQuery.refetch()
        void reviewsQuery.refetch()
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
                <p className="mt-1 text-muted-foreground">Filter and inspect collected Booking.com reviews</p>
            </div>

            <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetchAll}
                skeleton={
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                }
            >
                {propertiesQuery.data && reviewsQuery.data ? (
                    <>
                        <ReviewFiltersForm properties={propertiesQuery.data} params={params} />

                        <div className="grid gap-4">
                            {reviewsQuery.data.length === 0 ? (
                                <Card>
                                    <CardContent className="pt-6 text-sm text-muted-foreground">
                                        No reviews match these filters.
                                    </CardContent>
                                </Card>
                            ) : (
                                reviewsQuery.data.map((review) => (
                                    <ReviewCard
                                        key={review.id}
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
                    </>
                ) : null}
            </QueryState>
        </div>
    )
}
