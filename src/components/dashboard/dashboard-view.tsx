'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
    ReviewCard,
    StaleDataBanner,
    StatCard,
    SyncStatusBadge,
    TopicBar,
} from '@/components/dashboard/dashboard-parts'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import { useInvalidateCache } from '@/lib/mutations/cache.mutations'
import {
    useDashboardRecentReviewsQuery,
    usePropertyPerformanceQuery,
    useSyncHealthQuery,
    useTopicTrendsQuery,
    useWeeklyStatsQuery,
} from '@/lib/queries/dashboard.queries'

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        </div>
    )
}

export function DashboardView() {
    const weeklyStats = useWeeklyStatsQuery()
    const propertyPerformance = usePropertyPerformanceQuery()
    const topicTrends = useTopicTrendsQuery()
    const recentReviews = useDashboardRecentReviewsQuery()
    const syncHealth = useSyncHealthQuery()
    const invalidateCache = useInvalidateCache()

    const queries = [weeklyStats, propertyPerformance, topicTrends, recentReviews, syncHealth]
    const isLoading = queries.some((q) => q.isLoading)
    const isError = queries.some((q) => q.isError)
    const error = queries.find((q) => q.error)?.error

    const refetchAll = () => {
        for (const query of queries) {
            void query.refetch()
        }
    }

    return (
        <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetchAll}
            skeleton={<DashboardSkeleton />}
        >
            {weeklyStats.data &&
            propertyPerformance.data &&
            topicTrends.data &&
            recentReviews.data &&
            syncHealth.data ? (
                <DashboardContent
                    weeklyStats={weeklyStats.data}
                    propertyPerformance={propertyPerformance.data}
                    topicTrends={topicTrends.data}
                    recentReviews={recentReviews.data}
                    syncHealth={syncHealth.data}
                    onRefresh={() => invalidateCache.mutate()}
                    isRefreshing={invalidateCache.isPending}
                />
            ) : null}
        </QueryState>
    )
}

function DashboardContent({
    weeklyStats,
    propertyPerformance,
    topicTrends,
    recentReviews,
    syncHealth,
    onRefresh,
    isRefreshing,
}: {
    weeklyStats: NonNullable<ReturnType<typeof useWeeklyStatsQuery>['data']>
    propertyPerformance: NonNullable<ReturnType<typeof usePropertyPerformanceQuery>['data']>
    topicTrends: NonNullable<ReturnType<typeof useTopicTrendsQuery>['data']>
    recentReviews: NonNullable<ReturnType<typeof useDashboardRecentReviewsQuery>['data']>
    syncHealth: NonNullable<ReturnType<typeof useSyncHealthQuery>['data']>
    onRefresh: () => void
    isRefreshing: boolean
}) {
    const ratingDelta = weeklyStats.thisWeek.avgRating - weeklyStats.lastWeek.avgRating
    const reviewDelta = weeklyStats.thisWeek.reviewCount - weeklyStats.lastWeek.reviewCount
    const topTopic = topicTrends[0]

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Operations Dashboard</h1>
                    <p className="mt-1 text-muted-foreground">Review analytics for Azzurro Hotels Sydney properties</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                        Last sync check · {format(new Date(), 'dd MMM yyyy, HH:mm')}
                    </div>
                    <RefreshButton onClick={onRefresh} isPending={isRefreshing} />
                </div>
            </div>

            {syncHealth.isStale || syncHealth.hasBlockedOrFailed ? <StaleDataBanner /> : null}

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Average rating this week"
                    value={weeklyStats.thisWeek.avgRating.toFixed(1)}
                    subtitle="Booking.com 1–10 scale"
                    delta={ratingDelta}
                />
                <StatCard
                    title="Reviews this week"
                    value={String(weeklyStats.thisWeek.reviewCount)}
                    subtitle={`${reviewDelta >= 0 ? '+' : ''}${reviewDelta} vs last week`}
                />
                <StatCard
                    title="New reviews last sync"
                    value={String(syncHealth.totalNewReviews)}
                    subtitle="Across all properties"
                />
            </div>

            {topTopic ? (
                <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                        <strong className="text-foreground">{topTopic.percentage}%</strong> of negative reviews this
                        week mentioned <strong className="text-foreground">{formatTopicLabel(topTopic.topic)}</strong>
                        -related issues.
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Property performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Delta</TableHead>
                                    <TableHead>Reviews</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {propertyPerformance.map((row) => (
                                    <TableRow key={row.property.id}>
                                        <TableCell>
                                            <Link
                                                href={`/properties/${row.property.slug}`}
                                                className="font-medium hover:underline"
                                            >
                                                {row.property.name
                                                    .replace('Azzurro Pod Hotel - ', '')
                                                    .replace('Olympic Hotel ', 'Olympic ')}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{row.avgRating.toFixed(1)}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.delta >= 0 ? 'default' : 'destructive'}>
                                                {row.delta >= 0 ? '+' : ''}
                                                {row.delta.toFixed(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{row.reviewCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Negative review topics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {topicTrends.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No negative reviews this week yet.</p>
                        ) : (
                            topicTrends.map((topic) => (
                                <TopicBar
                                    key={topic.topic}
                                    topic={topic.topic}
                                    percentage={topic.percentage}
                                    count={topic.count}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

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
                            {syncHealth.latestRuns.map(({ property, run }) => (
                                <TableRow key={property.id}>
                                    <TableCell>{property.name.replace('Azzurro Pod Hotel - ', '')}</TableCell>
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
                                              : '—'}
                                    </TableCell>
                                    <TableCell>{run?.reviewsInserted ?? '0'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Recent reviews</h2>
                    <Link href="/reviews" className="text-sm text-primary hover:underline">
                        View all
                    </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {recentReviews.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-sm text-muted-foreground">
                                No reviews yet. Run <code className="rounded bg-muted px-1 py-0.5">pnpm scrape</code>{' '}
                                after seeding the database.
                            </CardContent>
                        </Card>
                    ) : (
                        recentReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                propertyName={review.property.name.replace('Azzurro Pod Hotel - ', '')}
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
