'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Star, ThumbsDown } from 'lucide-react'
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
import { useReviewsQuery } from '@/lib/queries/reviews.queries'

const PeriodRatingTrendChart = dynamic(
    () => import('@/components/dashboard/dashboard-charts').then((module) => module.PeriodRatingTrendChart),
    { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
)

const RatingBandDistributionChart = dynamic(
    () => import('@/components/dashboard/dashboard-charts').then((module) => module.RatingBandDistributionChart),
    { ssr: false, loading: () => <Skeleton className="h-[240px] w-full" /> },
)

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

    return (
        <div className="min-w-0 space-y-6">
            {propertiesQuery.data ? (
                <DashboardScopeBar properties={propertiesQuery.data} lockedPropertySlug={slug} />
            ) : null}

            <QueryState
                isLoading={propertyQuery.isLoading}
                isError={propertyQuery.isError}
                error={propertyQuery.error}
                onRetry={() => propertyQuery.refetch()}
                skeleton={<Skeleton className="h-10 w-64" />}
            >
                {propertyQuery.data ? (
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
                                Booking ID: {propertyQuery.data.bookingPropertyId}
                            </Badge>
                            <Button asChild className="min-h-11 w-full sm:w-auto">
                                <Link
                                    href={buildReviewsDrillDownUrl({
                                        scope,
                                        property: propertyQuery.data.slug,
                                        representative: true,
                                    })}
                                >
                                    View filtered reviews
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-36" />
                        <Skeleton className="h-36" />
                        <Skeleton className="h-36" />
                    </div>
                }
            >
                {overviewQuery.data ? <PropertyKpiRow overview={overviewQuery.data} /> : null}
            </QueryState>

            <div className="grid min-w-0 gap-6 md:grid-cols-2">
                <QueryState
                    isLoading={seriesQuery.isLoading}
                    isError={seriesQuery.isError}
                    error={seriesQuery.error}
                    onRetry={() => seriesQuery.refetch()}
                    skeleton={
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[280px] w-full" />
                            </CardContent>
                        </Card>
                    }
                >
                    {seriesQuery.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating trend</CardTitle>
                                <CardDescription>Scoped to this property</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {seriesQuery.data.rating.length === 0 ? (
                                    <EmptyState message="No review history in this period." />
                                ) : (
                                    <PeriodRatingTrendChart
                                        rating={seriesQuery.data.rating}
                                        reviewVolume={seriesQuery.data.reviewVolume}
                                        granularity={seriesQuery.data.granularity}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>

                <QueryState
                    isLoading={seriesQuery.isLoading}
                    isError={seriesQuery.isError}
                    error={seriesQuery.error}
                    onRetry={() => seriesQuery.refetch()}
                    skeleton={
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[240px] w-full" />
                            </CardContent>
                        </Card>
                    }
                >
                    {seriesQuery.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {seriesQuery.data.ratingBands.length === 0 ? (
                                    <EmptyState message="No reviews in this period." />
                                ) : (
                                    <RatingBandDistributionChart data={seriesQuery.data.ratingBands} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>
            </div>

            <QueryState
                isLoading={topicImpactQuery.isLoading}
                isError={topicImpactQuery.isError}
                error={topicImpactQuery.error}
                onRetry={() => topicImpactQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Topic rating impact</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {topicImpactQuery.data && topicImpactQuery.data.topics.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Topic rating impact</CardTitle>
                            <CardDescription>
                                Negative topics that correlate with lower scores at this property
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 md:hidden">
                                {topicImpactQuery.data.topics.slice(0, 6).map((row) => (
                                    <div key={`${row.topic}-mobile`} className="rounded-lg border p-4 text-sm">
                                        <p className="break-words font-medium">
                                            {formatTopicLabel(row.topic as ReviewTopicKey)}
                                        </p>
                                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                                            <div>
                                                <dt>Mentions</dt>
                                                <dd className="font-mono tabular-nums text-foreground">
                                                    {row.negativeReviewCount}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Avg rating</dt>
                                                <dd className="font-mono tabular-nums text-foreground">
                                                    {row.averageRating?.toFixed(1) ?? 'n/a'}
                                                </dd>
                                            </div>
                                            <div className="col-span-2">
                                                <dt>Gap</dt>
                                                <dd className="font-mono tabular-nums text-foreground">
                                                    {row.ratingGap !== null
                                                        ? `${row.ratingGap >= 0 ? '+' : ''}${row.ratingGap.toFixed(1)}`
                                                        : 'n/a'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden overflow-x-auto md:block">
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
                                        {topicImpactQuery.data.topics.slice(0, 6).map((row) => (
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
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={<Skeleton className="h-24 w-full" />}
            >
                {overviewQuery.data && overviewQuery.data.positiveDrivers.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>What guests love here</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {overviewQuery.data.positiveDrivers.slice(0, 8).map((driver) => (
                                <Badge key={driver.topic} variant="outline" className="border-success/30 text-success">
                                    {formatTopicLabel(driver.topic)} · {driver.positiveMentionRate?.toFixed(0) ?? 0}%
                                </Badge>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={reviewsQuery.isLoading}
                isError={reviewsQuery.isError}
                error={reviewsQuery.error}
                onRetry={() => reviewsQuery.refetch()}
                skeleton={
                    <div className="space-y-3">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                }
            >
                {propertyQuery.data && reviewsQuery.data ? (
                    <div>
                        <h3 className="mb-4 text-base font-semibold tracking-tight">Representative reviews</h3>
                        <div className="grid gap-3">
                            {(reviewsQuery.data.pages[0]?.items ?? []).length === 0 ? (
                                <EmptyState message="No reviews collected for this property yet." />
                            ) : (
                                (reviewsQuery.data.pages[0]?.items ?? []).map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        propertyName={propertyQuery.data.name}
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
                ) : null}
            </QueryState>
        </div>
    )
}

function PropertyKpiRow({ overview }: { overview: NonNullable<ReturnType<typeof useDashboardOverviewQuery>['data']> }) {
    const propertyRow = overview.propertyComparison[0]
    if (!propertyRow) return null

    return (
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
                    propertyRow.reviewActivity.value === null ? 'No reviews' : String(propertyRow.reviewActivity.value)
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
    )
}
