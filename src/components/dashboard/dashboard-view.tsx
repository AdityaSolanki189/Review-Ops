'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
    ChartSectionSkeleton,
    NegativeTopicsChart,
    PropertyCompareChart,
    RatingDistributionChart,
    WeeklyRatingTrendChart,
} from '@/components/dashboard/dashboard-charts'
import { ReviewCard, StaleDataBanner, StatCard, SyncStatusBadge } from '@/components/dashboard/dashboard-parts'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import { useInvalidateCache } from '@/lib/mutations/cache.mutations'
import {
    useDashboardRecentReviewsQuery,
    usePropertyPerformanceQuery,
    useRatingDistributionQuery,
    useSyncHealthQuery,
    useTopicTrendsQuery,
    useWeeklyBriefingQuery,
    useWeeklySeriesQuery,
    useWeeklyStatsQuery,
} from '@/lib/queries/dashboard.queries'

function shortPropertyName(name: string): string {
    return name.replace('Azzurro Pod Hotel - ', '').replace('Olympic Hotel ', 'Olympic ')
}

function KpiSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    )
}

export function DashboardView() {
    const weeklyStats = useWeeklyStatsQuery()
    const propertyPerformance = usePropertyPerformanceQuery()
    const topicTrends = useTopicTrendsQuery()
    const weeklySeries = useWeeklySeriesQuery()
    const ratingDistribution = useRatingDistributionQuery()
    const recentReviews = useDashboardRecentReviewsQuery()
    const syncHealth = useSyncHealthQuery()
    const weeklyBriefing = useWeeklyBriefingQuery()
    const invalidateCache = useInvalidateCache()

    const ratingDelta =
        weeklyStats.data != null ? weeklyStats.data.thisWeek.avgRating - weeklyStats.data.lastWeek.avgRating : undefined
    const reviewDelta =
        weeklyStats.data != null
            ? weeklyStats.data.thisWeek.reviewCount - weeklyStats.data.lastWeek.reviewCount
            : undefined

    const topTopic = topicTrends.data?.[0]
    const worstProperty = propertyPerformance.data
        ?.filter((row) => row.reviewCount > 0)
        .sort((a, b) => a.delta - b.delta)[0]

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Review analytics for Azzurro Hotels Sydney properties
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Updated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                    <RefreshButton onClick={() => invalidateCache.mutate()} isPending={invalidateCache.isPending} />
                </div>
            </div>

            {syncHealth.data && (syncHealth.data.isStale || syncHealth.data.hasBlockedOrFailed) ? (
                <StaleDataBanner />
            ) : null}

            <QueryState
                isLoading={weeklyStats.isLoading}
                isError={weeklyStats.isError}
                error={weeklyStats.error}
                onRetry={() => weeklyStats.refetch()}
                skeleton={<KpiSkeleton />}
            >
                {weeklyStats.data && syncHealth.data ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatCard
                                title="Average rating this week"
                                value={weeklyStats.data.thisWeek.avgRating.toFixed(1)}
                                subtitle="Booking.com 1-10 scale"
                                delta={ratingDelta}
                            />
                            <StatCard
                                title="Reviews this week"
                                value={String(weeklyStats.data.thisWeek.reviewCount)}
                                subtitle={`${reviewDelta != null && reviewDelta >= 0 ? '+' : ''}${reviewDelta ?? 0} vs last week`}
                            />
                            <StatCard
                                title="New reviews last sync"
                                value={String(syncHealth.data.totalNewReviews)}
                                subtitle="Across all properties"
                            />
                        </div>

                        {(topTopic || worstProperty) && (
                            <Card>
                                <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
                                    {worstProperty && worstProperty.delta < 0 ? (
                                        <p>
                                            <strong className="text-foreground">
                                                {shortPropertyName(worstProperty.property.name)}
                                            </strong>{' '}
                                            dropped {Math.abs(worstProperty.delta).toFixed(1)} points this week.
                                        </p>
                                    ) : null}
                                    {topTopic ? (
                                        <p>
                                            <strong className="text-foreground">{topTopic.percentage}%</strong> of
                                            negative reviews mentioned{' '}
                                            <strong className="text-foreground">
                                                {formatTopicLabel(topTopic.topic)}
                                            </strong>
                                            .
                                        </p>
                                    ) : null}
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={weeklyBriefing.isLoading}
                isError={weeklyBriefing.isError}
                error={weeklyBriefing.error}
                onRetry={() => weeklyBriefing.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>This week&apos;s briefing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {weeklyBriefing.data?.available ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>This week&apos;s briefing</CardTitle>
                            <CardDescription>AI summary of portfolio review trends</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p>{weeklyBriefing.data.summary}</p>
                            {weeklyBriefing.data.actions.length > 0 ? (
                                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                    {weeklyBriefing.data.actions.map((action) => (
                                        <li key={action}>{action}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : weeklyBriefing.data && !weeklyBriefing.data.available ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>This week&apos;s briefing</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {weeklyBriefing.data.message}
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <div className="grid gap-6 xl:grid-cols-2">
                <QueryState
                    isLoading={weeklySeries.isLoading}
                    isError={weeklySeries.isError}
                    error={weeklySeries.error}
                    onRetry={() => weeklySeries.refetch()}
                    skeleton={<ChartSectionSkeleton title="Rating trend" />}
                >
                    {weeklySeries.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating trend</CardTitle>
                                <CardDescription>Last 8 weeks across all properties</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {weeklySeries.data.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No review history yet.</p>
                                ) : (
                                    <WeeklyRatingTrendChart data={weeklySeries.data} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>

                <QueryState
                    isLoading={propertyPerformance.isLoading}
                    isError={propertyPerformance.isError}
                    error={propertyPerformance.error}
                    onRetry={() => propertyPerformance.refetch()}
                    skeleton={<ChartSectionSkeleton title="Property comparison" />}
                >
                    {propertyPerformance.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Property comparison</CardTitle>
                                <CardDescription>This week vs last week average rating</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {propertyPerformance.data.every((row) => row.reviewCount === 0) ? (
                                    <p className="text-sm text-muted-foreground">No reviews this week yet.</p>
                                ) : (
                                    <PropertyCompareChart data={propertyPerformance.data} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>

                <QueryState
                    isLoading={topicTrends.isLoading}
                    isError={topicTrends.isError}
                    error={topicTrends.error}
                    onRetry={() => topicTrends.refetch()}
                    skeleton={<ChartSectionSkeleton title="Negative review topics" />}
                >
                    {topicTrends.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Negative review topics</CardTitle>
                                <CardDescription>Most mentioned issues this week</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topicTrends.data.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No negative reviews this week yet.</p>
                                ) : (
                                    <NegativeTopicsChart data={topicTrends.data} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>

                <QueryState
                    isLoading={ratingDistribution.isLoading}
                    isError={ratingDistribution.isError}
                    error={ratingDistribution.error}
                    onRetry={() => ratingDistribution.refetch()}
                    skeleton={<ChartSectionSkeleton title="Rating distribution" />}
                >
                    {ratingDistribution.data ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rating distribution</CardTitle>
                                <CardDescription>How scores cluster this week</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {ratingDistribution.data.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No reviews this week yet.</p>
                                ) : (
                                    <RatingDistributionChart data={ratingDistribution.data} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>
            </div>

            <QueryState
                isLoading={syncHealth.isLoading}
                isError={syncHealth.isError}
                error={syncHealth.error}
                onRetry={() => syncHealth.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Last synchronization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {syncHealth.data ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Last synchronization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Finished</TableHead>
                                        <TableHead>Latest review</TableHead>
                                        <TableHead>Inserted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {syncHealth.data.latestRuns.map(({ property, run }) => (
                                        <TableRow key={property.id}>
                                            <TableCell>{shortPropertyName(property.name)}</TableCell>
                                            <TableCell>
                                                <SyncStatusBadge status={run?.status} />
                                            </TableCell>
                                            <TableCell>
                                                {run?.finishedAt
                                                    ? format(run.finishedAt, 'dd MMM yyyy, HH:mm')
                                                    : 'In progress / never'}
                                            </TableCell>
                                            <TableCell>
                                                {run?.newestReviewAt
                                                    ? format(run.newestReviewAt, 'dd MMM yyyy')
                                                    : property.latestReviewAt
                                                      ? format(property.latestReviewAt, 'dd MMM yyyy')
                                                      : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono tabular-nums">
                                                {run?.reviewsInserted ?? '0'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={recentReviews.isLoading}
                isError={recentReviews.isError}
                error={recentReviews.error}
                onRetry={() => recentReviews.refetch()}
                skeleton={
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                }
            >
                {recentReviews.data ? (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold tracking-tight">Recent reviews</h2>
                            <Link href="/reviews" className="text-sm text-primary hover:underline">
                                View all
                            </Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {recentReviews.data.length === 0 ? (
                                <Card>
                                    <CardContent className="pt-6 text-sm text-muted-foreground">
                                        No reviews yet. Run{' '}
                                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                                            pnpm scrape
                                        </code>{' '}
                                        after seeding the database.
                                    </CardContent>
                                </Card>
                            ) : (
                                recentReviews.data.map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        propertyName={shortPropertyName(review.property.name)}
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
