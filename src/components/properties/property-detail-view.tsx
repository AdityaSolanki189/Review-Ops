'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NegativeTopicsChart } from '@/components/dashboard/dashboard-charts'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { ApiError } from '@/lib/queries/api'
import { usePropertyBySlugQuery, usePropertyTopicMixQuery } from '@/lib/queries/properties.queries'
import { useReviewsQuery, type ReviewListItem } from '@/lib/queries/reviews.queries'

interface PropertyDetailViewProps {
    slug: string
}

export function PropertyDetailView({ slug }: PropertyDetailViewProps) {
    const propertyQuery = usePropertyBySlugQuery(slug)
    const topicMixQuery = usePropertyTopicMixQuery(slug)
    const reviewsQuery = useReviewsQuery({ propertySlug: slug, limit: 10 })

    if (propertyQuery.error instanceof ApiError && propertyQuery.error.status === 404) {
        notFound()
    }

    const isLoading = propertyQuery.isLoading || topicMixQuery.isLoading || reviewsQuery.isLoading
    const isError = propertyQuery.isError || topicMixQuery.isError || reviewsQuery.isError
    const error = propertyQuery.error ?? topicMixQuery.error ?? reviewsQuery.error

    const refetchAll = () => {
        void propertyQuery.refetch()
        void topicMixQuery.refetch()
        void reviewsQuery.refetch()
    }

    return (
        <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetchAll}
            skeleton={
                <div className="space-y-8">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                    </div>
                </div>
            }
        >
            {propertyQuery.data && topicMixQuery.data && reviewsQuery.data ? (
                <PropertyDetailContent
                    property={propertyQuery.data}
                    topicMix={topicMixQuery.data}
                    recentReviews={reviewsQuery.data.pages[0]?.items ?? []}
                />
            ) : null}
        </QueryState>
    )
}

function PropertyDetailContent({
    property,
    topicMix,
    recentReviews,
}: {
    property: NonNullable<ReturnType<typeof usePropertyBySlugQuery>['data']>
    topicMix: NonNullable<ReturnType<typeof usePropertyTopicMixQuery>['data']>
    recentReviews: ReviewListItem[]
}) {
    const negativeTopics = topicMix
        .filter((row) => row.sentiment === 'negative')
        .map((row) => ({
            topic: row.topic as ReviewTopicKey,
            count: Number(row.count),
            percentage: 0,
        }))

    const negativeTotal = negativeTopics.reduce((sum, row) => sum + row.count, 0)
    for (const topic of negativeTopics) {
        topic.percentage = negativeTotal > 0 ? Math.round((topic.count / negativeTotal) * 100) : 0
    }

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/properties" className="text-sm text-muted-foreground hover:underline">
                        Back to properties
                    </Link>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{property.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{property.bookingUrl}</p>
                </div>
                <Badge variant="outline" className="font-mono tabular-nums">
                    Booking ID: {property.bookingPropertyId}
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Negative topic mix</CardTitle>
                        <CardDescription>What guests complain about at this property</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {negativeTopics.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No classified negative topics yet.</p>
                        ) : (
                            <NegativeTopicsChart data={negativeTopics} />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All topic signals</CardTitle>
                        <CardDescription>Positive and negative mentions detected in reviews</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {topicMix.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No topic classifications yet.</p>
                        ) : (
                            topicMix.map((row) => (
                                <Badge key={`${row.topic}-${row.sentiment}`} variant="outline">
                                    {formatTopicLabel(row.topic as ReviewTopicKey)} · {row.sentiment} · {row.count}
                                </Badge>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div>
                <h3 className="mb-4 text-xl font-semibold tracking-tight">Recent reviews</h3>
                <div className="grid gap-4">
                    {recentReviews.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-sm text-muted-foreground">
                                No reviews collected for this property yet.
                            </CardContent>
                        </Card>
                    ) : (
                        recentReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                propertyName={property.name}
                                rating={review.rating}
                                title={review.title}
                                excerpt={review.negativeText ?? review.positiveText}
                                reviewDate={review.reviewDate}
                                topics={review.topics}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
