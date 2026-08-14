'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { PeriodRatingTrendChart, RatingBandDistributionChart } from '@/components/dashboard/dashboard-charts'
import { MetricCard, ReviewCard } from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
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
        <div className="space-y-8">
            {propertiesQuery.data ? <DashboardScopeBar properties={propertiesQuery.data} /> : null}

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
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/properties" className="text-sm text-muted-foreground hover:underline">
                        Back to properties
                    </Link>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{property.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{scopeComparisonLabel(scope)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="font-mono tabular-nums">
                        Booking ID: {property.bookingPropertyId}
                    </Badge>
                    <Link
                        href={buildReviewsDrillDownUrl({ scope, property: property.slug, representative: true })}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        View filtered reviews
                    </Link>
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
                    />
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Rating trend</CardTitle>
                        <CardDescription>Scoped to this property</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {series.rating.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No review history in this period.</p>
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
                            <p className="text-sm text-muted-foreground">No reviews in this period.</p>
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
                            <Badge key={driver.topic} variant="outline">
                                {formatTopicLabel(driver.topic)} · {driver.positiveMentionRate?.toFixed(0) ?? 0}%
                            </Badge>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            <div>
                <h3 className="mb-4 text-xl font-semibold tracking-tight">Representative reviews</h3>
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
