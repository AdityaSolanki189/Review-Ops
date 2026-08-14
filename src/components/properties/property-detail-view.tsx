'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Star, ThumbsDown } from 'lucide-react'
import { PeriodRatingTrendChart, RatingBandDistributionChart } from '@/components/dashboard/dashboard-charts'
import { EmptyState, MetricCard, ReviewCard } from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { buildReviewsDrillDownUrl, resolveScopeFromSearchParams, scopeComparisonLabel } from '@/lib/dashboard-scope'
import { formatMetricDelta, formatMetricValue } from '@/lib/dashboard-status'
import { ApiError } from '@/lib/queries/api'
import {
    useDashboardOverviewQuery,
    useDashboardSeriesQuery,
    useDashboardTopicImpactQuery,
} from '@/lib/queries/dashboard.queries'
import { usePropertiesListQuery, usePropertyBySlugQuery } from '@/lib/queries/properties.queries'
import { useReviewsQuery, type ReviewListItem } from '@/lib/queries/reviews.queries'

interface PropertyDetailViewProps {
    slug: string
}

export function PropertyDetailView({ slug }: PropertyDetailViewProps) {
    const searchParams = useSearchParams()
    const baseScope = resolveScopeFromSearchParams(searchParams)
    const scope = { ...baseScope, propertySlug: slug }
    const propertiesQuery = usePropertiesListQuery()
    const propertyQuery = usePropertyBySlugQuery(slug)
    const overviewQuery = useDashboardOverviewQuery(scope)
    const seriesQuery = useDashboardSeriesQuery(scope)
    const topicImpactQuery = useDashboardTopicImpactQuery(scope)
    const reviewsQuery = useReviewsQuery({ propertySlug: slug, limit: 10, representative: true })

    if (propertyQuery.error instanceof ApiError && propertyQuery.error.status === 404) {
        notFound()
    }

    const isLoading =
        propertyQuery.isLoading ||
        overviewQuery.isLoading ||
        seriesQuery.isLoading ||
        topicImpactQuery.isLoading ||
        reviewsQuery.isLoading
    const isError =
        propertyQuery.isError ||
        overviewQuery.isError ||
        seriesQuery.isError ||
        topicImpactQuery.isError ||
        reviewsQuery.isError
    const error =
        propertyQuery.error ?? overviewQuery.error ?? seriesQuery.error ?? topicImpactQuery.error ?? reviewsQuery.error

    const refetchAll = () => {
        void propertyQuery.refetch()
        void overviewQuery.refetch()
        void seriesQuery.refetch()
        void topicImpactQuery.refetch()
        void reviewsQuery.refetch()
    }

    return (
        <div className="space-y-6">
            {propertiesQuery.data ? (
                <DashboardScopeBar properties={propertiesQuery.data} lockedPropertySlug={slug} />
            ) : null}

            <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetchAll}
                skeleton={
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-64" />
                        <div className="grid gap-6 md:grid-cols-2">
                            <Skeleton className="h-64" />
                            <Skeleton className="h-64" />
                        </div>
                    </div>
                }
            >
                {propertyQuery.data &&
                overviewQuery.data &&
                seriesQuery.data &&
                topicImpactQuery.data &&
                reviewsQuery.data ? (
                    <PropertyDetailContent
                        property={propertyQuery.data}
                        overview={overviewQuery.data}
                        series={seriesQuery.data}
                        topicImpact={topicImpactQuery.data}
                        recentReviews={reviewsQuery.data.pages[0]?.items ?? []}
                        scope={scope}
                    />
                ) : null}
            </QueryState>
        </div>
    )
}

function PropertyDetailContent({
    property,
    overview,
    series,
    topicImpact,
    recentReviews,
    scope,
}: {
    property: NonNullable<ReturnType<typeof usePropertyBySlugQuery>['data']>
    overview: NonNullable<ReturnType<typeof useDashboardOverviewQuery>['data']>
    series: NonNullable<ReturnType<typeof useDashboardSeriesQuery>['data']>
    topicImpact: NonNullable<ReturnType<typeof useDashboardTopicImpactQuery>['data']>
    recentReviews: ReviewListItem[]
    scope: ReturnType<typeof resolveScopeFromSearchParams> & { propertySlug: string }
}) {
    const propertyRow = overview.propertyComparison[0]

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <Link
                        href="/properties"
                        className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:underline"
                    >
                        ← Back to properties
                    </Link>
                    <p className="text-sm text-muted-foreground">{scopeComparisonLabel(scope)}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <Badge variant="outline" className="w-fit font-mono tabular-nums">
                        Booking ID: {property.bookingPropertyId}
                    </Badge>
                    <Button asChild className="min-h-11 w-full sm:w-auto">
                        <Link href={buildReviewsDrillDownUrl({ scope, property: property.slug, representative: true })}>
                            View filtered reviews
                        </Link>
                    </Button>
                </div>
            </div>

            {propertyRow ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                        title="Average rating"
                        value={formatMetricValue(propertyRow.averageRating)}
                        subtitle={`${propertyRow.reviewActivity.sampleSize} reviews`}
                        delta={propertyRow.averageRating.delta}
                        insufficient={propertyRow.averageRating.status === 'insufficient_data'}
                        icon={Star}
                        tone="success"
                    />
                    <MetricCard
                        title="Review activity"
                        value={
                            propertyRow.reviewActivity.value === null
                                ? 'No reviews'
                                : String(propertyRow.reviewActivity.value)
                        }
                        subtitle={formatMetricDelta(propertyRow.reviewActivity, ' reviews')}
                        delta={propertyRow.reviewActivity.delta}
                        deltaSuffix=""
                        insufficient={propertyRow.reviewActivity.status === 'insufficient_data'}
                        icon={MessageSquare}
                        tone="primary"
                    />
                    <MetricCard
                        title="Low-score rate"
                        value={
                            propertyRow.lowScoreRate.value === null
                                ? 'No reviews'
                                : `${propertyRow.lowScoreRate.value.toFixed(1)}%`
                        }
                        subtitle="Ratings ≤5"
                        delta={propertyRow.lowScoreRate.delta}
                        deltaSuffix=" pp"
                        insufficient={propertyRow.lowScoreRate.status === 'insufficient_data'}
                        icon={ThumbsDown}
                        tone="warning"
                        invertDelta
                    />
                </div>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Rating trend</CardTitle>
                        <CardDescription>Scoped to this property</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {series.rating.length === 0 ? (
                            <EmptyState message="No review history in this period." />
                        ) : (
                            <PeriodRatingTrendChart
                                rating={series.rating}
                                reviewVolume={series.reviewVolume}
                                granularity={series.granularity}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rating distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {series.ratingBands.length === 0 ? (
                            <EmptyState message="No reviews in this period." />
                        ) : (
                            <RatingBandDistributionChart data={series.ratingBands} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {topicImpact.topics.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Topic rating impact</CardTitle>
                        <CardDescription>
                            Negative topics that correlate with lower scores at this property
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Topic</TableHead>
                                    <TableHead>Mentions</TableHead>
                                    <TableHead>Avg rating</TableHead>
                                    <TableHead>Gap</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topicImpact.topics.slice(0, 6).map((row) => (
                                    <TableRow key={row.topic}>
                                        <TableCell>{formatTopicLabel(row.topic as ReviewTopicKey)}</TableCell>
                                        <TableCell className="font-mono tabular-nums">
                                            {row.negativeReviewCount}
                                        </TableCell>
                                        <TableCell className="font-mono tabular-nums">
                                            {row.averageRating?.toFixed(1) ?? 'n/a'}
                                        </TableCell>
                                        <TableCell className="font-mono tabular-nums">
                                            {row.ratingGap !== null
                                                ? `${row.ratingGap >= 0 ? '+' : ''}${row.ratingGap.toFixed(1)}`
                                                : 'n/a'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : null}

            {overview.positiveDrivers.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>What guests love here</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {overview.positiveDrivers.slice(0, 8).map((driver) => (
                            <Badge key={driver.topic} variant="outline" className="border-success/30 text-success">
                                {formatTopicLabel(driver.topic)} · {driver.positiveMentionRate?.toFixed(0) ?? 0}%
                            </Badge>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            <div>
                <h3 className="mb-4 text-base font-semibold tracking-tight">Representative reviews</h3>
                <div className="grid gap-3">
                    {recentReviews.length === 0 ? (
                        <EmptyState message="No reviews collected for this property yet." />
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
