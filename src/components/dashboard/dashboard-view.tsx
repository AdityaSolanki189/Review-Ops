'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { PeriodRatingTrendChart, RatingBandDistributionChart } from '@/components/dashboard/dashboard-charts'
import {
    FreshnessStrip,
    MetricCard,
    PortfolioStatusStrip,
    ReviewCard,
    StaleDataBanner,
    SyncStatusBadge,
} from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { IssueExplainerSheet } from '@/components/dashboard/issue-explainer-sheet'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import {
    buildPortfolioStatus,
    formatMetricDelta,
    formatMetricValue,
    isAnomalyIssue,
    portfolioAverageRating,
    propertyVsPortfolioGap,
} from '@/lib/dashboard-status'
import { buildReviewsDrillDownUrl, resolveScopeFromSearchParams, shortPropertyName } from '@/lib/dashboard-scope'
import { useInvalidateCache } from '@/lib/mutations/cache.mutations'
import {
    useDashboardIssuesQuery,
    useDashboardOverviewQuery,
    useDashboardRecentReviewsQuery,
    useDashboardSeriesQuery,
    useDashboardTopicImpactQuery,
    useDashboardTopicMatrixQuery,
    usePortfolioBriefingQuery,
    useSyncHealthQuery,
} from '@/lib/queries/dashboard.queries'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'

function KpiSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
        </div>
    )
}

function heatCellClass(rate: number | null): string {
    if (rate === null || rate === 0) return 'bg-muted/40 text-muted-foreground'
    if (rate >= 20) return 'bg-destructive/15 text-destructive'
    if (rate >= 10) return 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
    return 'bg-primary/10 text-foreground'
}

export function DashboardView() {
    const searchParams = useSearchParams()
    const scope = resolveScopeFromSearchParams(searchParams)
    const [explainerTarget, setExplainerTarget] = useState<{
        propertySlug: string
        topic: ReviewTopicKey
    } | null>(null)
    const propertiesQuery = usePropertiesListQuery()
    const overviewQuery = useDashboardOverviewQuery(scope)
    const issuesQuery = useDashboardIssuesQuery(scope)
    const topicMatrixQuery = useDashboardTopicMatrixQuery(scope)
    const topicImpactQuery = useDashboardTopicImpactQuery(scope)
    const seriesQuery = useDashboardSeriesQuery(scope)
    const recentReviewsQuery = useDashboardRecentReviewsQuery()
    const syncHealthQuery = useSyncHealthQuery()
    const briefingQuery = usePortfolioBriefingQuery(scope)
    const invalidateCache = useInvalidateCache()

    const overview = overviewQuery.data
    const issues = issuesQuery.data?.issues ?? []
    const portfolioAvg = overview ? portfolioAverageRating(overview.propertyComparison) : null
    const statusSignals = overview ? buildPortfolioStatus(overview, issues) : []

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Portfolio performance across Azzurro Sydney properties
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Updated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                    <RefreshButton onClick={() => invalidateCache.mutate()} isPending={invalidateCache.isPending} />
                </div>
            </div>

            {propertiesQuery.data ? <DashboardScopeBar properties={propertiesQuery.data} /> : null}

            {syncHealthQuery.data && (syncHealthQuery.data.isStale || syncHealthQuery.data.hasBlockedOrFailed) ? (
                <StaleDataBanner />
            ) : null}

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={<Skeleton className="h-10 w-full max-w-3xl" />}
            >
                {overview ? (
                    <FreshnessStrip
                        latestReviewAt={overview.freshness.latestReviewAt}
                        latestScrapedAt={overview.freshness.latestScrapedAt}
                        sources={overview.freshness.sources}
                        classificationCoverage={overview.classificationCoverage.value}
                    />
                ) : null}
            </QueryState>

            <QueryState
                isLoading={overviewQuery.isLoading || issuesQuery.isLoading}
                isError={overviewQuery.isError || issuesQuery.isError}
                error={overviewQuery.error ?? issuesQuery.error}
                onRetry={() => {
                    void overviewQuery.refetch()
                    void issuesQuery.refetch()
                }}
                skeleton={<Skeleton className="h-40 w-full" />}
            >
                {statusSignals.length > 0 ? <PortfolioStatusStrip signals={statusSignals} /> : null}
            </QueryState>

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={<KpiSkeleton />}
            >
                {overview ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            title="Average rating"
                            value={formatMetricValue(overview.averageRating)}
                            subtitle={`${overview.reviewActivity.sampleSize} reviews in period`}
                            delta={overview.averageRating.delta}
                            insufficient={overview.averageRating.status === 'insufficient_data'}
                        />
                        <MetricCard
                            title="Review activity"
                            value={
                                overview.reviewActivity.value === null
                                    ? 'No reviews'
                                    : String(overview.reviewActivity.value)
                            }
                            subtitle={formatMetricDelta(overview.reviewActivity, ' reviews')}
                            delta={overview.reviewActivity.delta}
                            deltaSuffix=""
                            insufficient={overview.reviewActivity.status === 'insufficient_data'}
                        />
                        <MetricCard
                            title="Low-score rate"
                            value={
                                overview.lowScoreRate.value === null
                                    ? 'No reviews'
                                    : `${overview.lowScoreRate.value.toFixed(1)}%`
                            }
                            subtitle="Ratings ≤5"
                            delta={overview.lowScoreRate.delta}
                            deltaSuffix=" pp"
                            insufficient={overview.lowScoreRate.status === 'insufficient_data'}
                        />
                        <MetricCard
                            title="Top negative topic"
                            value={
                                overview.topNegativeTopic
                                    ? formatTopicLabel(overview.topNegativeTopic.topic)
                                    : 'None detected'
                            }
                            subtitle={
                                overview.topNegativeTopic
                                    ? `${overview.topNegativeTopic.negativeMentionRate.toFixed(1)}% of reviews`
                                    : 'No classified negative topics'
                            }
                            delta={overview.topNegativeTopic?.momentumPercentagePoints}
                            deltaSuffix=" pp"
                            insufficient={overview.topNegativeTopic?.status === 'insufficient_data'}
                        />
                    </div>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={briefingQuery.isLoading}
                isError={briefingQuery.isError}
                error={briefingQuery.error}
                onRetry={() => briefingQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio brief</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {briefingQuery.data?.available ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio brief</CardTitle>
                            <CardDescription>
                                {briefingQuery.data.source === 'ai'
                                    ? 'AI-enhanced summary from calculated metrics'
                                    : 'Summary from calculated metrics'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p>{briefingQuery.data.summary}</p>
                            {briefingQuery.data.actions.length > 0 ? (
                                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                    {briefingQuery.data.actions.map((action) => (
                                        <li key={action}>{action}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : briefingQuery.data && !briefingQuery.data.available ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio brief</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {briefingQuery.data.message}
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>What guests love</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-24 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {overview && overview.positiveDrivers.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>What guests love</CardTitle>
                            <CardDescription>Top positive operational drivers in this period</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {overview.positiveDrivers.slice(0, 6).map((driver) => (
                                <div key={driver.topic} className="rounded-lg border p-3">
                                    <p className="font-medium">{formatTopicLabel(driver.topic)}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {driver.positiveMentionRate?.toFixed(1) ?? '0'}% positive ·{' '}
                                        {driver.mentionCount} mentions
                                    </p>
                                    {driver.momentumPercentagePoints !== null ? (
                                        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                                            {driver.momentumPercentagePoints >= 0 ? '+' : ''}
                                            {driver.momentumPercentagePoints.toFixed(1)} pp vs prior
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={issuesQuery.isLoading}
                isError={issuesQuery.isError}
                error={issuesQuery.error}
                onRetry={() => issuesQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Needs attention</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Needs attention</CardTitle>
                        <CardDescription>
                            Negative topic momentum ranked by percentage-point change. Rating gap shows association, not
                            causality.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {issues.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No major operational issue spikes detected in this period.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Property</TableHead>
                                            <TableHead>Topic</TableHead>
                                            <TableHead title="Negative mentions as % of all reviews in period">
                                                Of all reviews
                                            </TableHead>
                                            <TableHead title="Negative mentions as % of low-score reviews (≤5)">
                                                Of low scores
                                            </TableHead>
                                            <TableHead>Change</TableHead>
                                            <TableHead>Rating gap</TableHead>
                                            <TableHead>Sample</TableHead>
                                            <TableHead>Latest</TableHead>
                                            <TableHead />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {issues.slice(0, 8).map((issue) => {
                                            const href = buildReviewsDrillDownUrl({
                                                scope,
                                                property: issue.propertySlug,
                                                topic: issue.topic,
                                                sentiment: 'negative',
                                                representative: true,
                                            })
                                            return (
                                                <TableRow key={`${issue.propertySlug}-${issue.topic}`}>
                                                    <TableCell>
                                                        <Link href={href} className="font-medium hover:underline">
                                                            {formatPropertySlug(issue.propertySlug)}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>{formatTopicLabel(issue.topic)}</TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {issue.portfolioNegativeShare !== null
                                                            ? `${issue.portfolioNegativeShare.toFixed(1)}%`
                                                            : 'n/a'}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {issue.negativeReviewShare !== null
                                                            ? `${issue.negativeReviewShare.toFixed(1)}%`
                                                            : 'n/a'}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {issue.momentumPercentagePoints !== null
                                                            ? `${issue.momentumPercentagePoints >= 0 ? '+' : ''}${issue.momentumPercentagePoints.toFixed(1)} pp`
                                                            : 'n/a'}
                                                        {isAnomalyIssue(issue) ? (
                                                            <Badge variant="destructive" className="ml-2">
                                                                Anomaly
                                                            </Badge>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {issue.ratingGap !== null
                                                            ? `${issue.ratingGap >= 0 ? '+' : ''}${issue.ratingGap.toFixed(1)}`
                                                            : 'n/a'}
                                                    </TableCell>
                                                    <TableCell className="font-mono tabular-nums">
                                                        {issue.sampleSize}
                                                    </TableCell>
                                                    <TableCell>
                                                        {issue.latestReviewAt
                                                            ? format(new Date(issue.latestReviewAt), 'd MMM yyyy')
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            type="button"
                                                            className="text-sm font-medium text-primary hover:underline"
                                                            onClick={() =>
                                                                setExplainerTarget({
                                                                    propertySlug: issue.propertySlug,
                                                                    topic: issue.topic,
                                                                })
                                                            }
                                                        >
                                                            Explain
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </QueryState>

            <QueryState
                isLoading={topicMatrixQuery.isLoading}
                isError={topicMatrixQuery.isError}
                error={topicMatrixQuery.error}
                onRetry={() => topicMatrixQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Topic heatmap</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-48 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {topicMatrixQuery.data ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Topic heatmap</CardTitle>
                            <CardDescription>
                                Negative mention rate by property and topic (% of reviews)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {topicMatrixQuery.data.rows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No topic data for this period.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Property</TableHead>
                                            {topicMatrixQuery.data.topics.map((topic) => (
                                                <TableHead key={topic} className="text-center text-xs">
                                                    {formatTopicLabel(topic).split(' ')[0]}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topicMatrixQuery.data.rows.map((row) => (
                                            <TableRow key={row.property.slug}>
                                                <TableCell className="font-medium">
                                                    {shortPropertyName(row.property.name)}
                                                </TableCell>
                                                {topicMatrixQuery.data.topics.map((topic) => {
                                                    const cell = row.cells[topic as ReviewTopicKey]
                                                    const href = buildReviewsDrillDownUrl({
                                                        scope,
                                                        property: row.property.slug,
                                                        topic: topic as ReviewTopicKey,
                                                        sentiment: 'negative',
                                                    })
                                                    return (
                                                        <TableCell key={topic} className="p-1">
                                                            <button
                                                                type="button"
                                                                className={`block w-full rounded px-2 py-1 text-center text-xs font-mono tabular-nums ${heatCellClass(cell.negativeMentionRate)}`}
                                                                onClick={() =>
                                                                    setExplainerTarget({
                                                                        propertySlug: row.property.slug,
                                                                        topic: topic as ReviewTopicKey,
                                                                    })
                                                                }
                                                            >
                                                                {cell.negativeMentionRate === null
                                                                    ? '-'
                                                                    : `${cell.negativeMentionRate.toFixed(0)}%`}
                                                            </button>
                                                            <Link
                                                                href={href}
                                                                className="mt-1 block text-center text-[10px] text-primary hover:underline"
                                                            >
                                                                Reviews
                                                            </Link>
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

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
                                Which negative topics correlate with the lowest scores (association, not causality)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Topic</TableHead>
                                        <TableHead>Negative mentions</TableHead>
                                        <TableHead>Avg rating</TableHead>
                                        <TableHead>Rating gap</TableHead>
                                        <TableHead>Impact score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topicImpactQuery.data.topics.slice(0, 8).map((row) => (
                                        <TableRow key={row.topic}>
                                            <TableCell>{formatTopicLabel(row.topic)}</TableCell>
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
                                            <TableCell className="font-mono tabular-nums">
                                                {row.impactScore !== null ? row.impactScore.toFixed(1) : 'n/a'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <div className="grid gap-6 xl:grid-cols-2">
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
                                <CardDescription>
                                    {seriesQuery.data.granularity === 'day' ? 'Daily' : 'Weekly'} average rating and
                                    review volume
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {seriesQuery.data.rating.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No review history in this period.</p>
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
                                <CardDescription>How scores cluster in the selected period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {seriesQuery.data.ratingBands.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No reviews in this period.</p>
                                ) : (
                                    <RatingBandDistributionChart data={seriesQuery.data.ratingBands} />
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </QueryState>
            </div>

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => overviewQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Property comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {overview ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Property comparison</CardTitle>
                            <CardDescription>
                                Current period vs previous period. Portfolio average:{' '}
                                {portfolioAvg !== null ? portfolioAvg.toFixed(1) : 'n/a'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>vs previous</TableHead>
                                        <TableHead>vs portfolio</TableHead>
                                        <TableHead>Reviews</TableHead>
                                        <TableHead>Low-score rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overview.propertyComparison.map((row) => {
                                        const gap = propertyVsPortfolioGap(row.averageRating.value, portfolioAvg)
                                        const href = buildReviewsDrillDownUrl({
                                            scope,
                                            property: row.property.slug,
                                        })
                                        return (
                                            <TableRow key={row.property.slug}>
                                                <TableCell>
                                                    <Link href={href} className="font-medium hover:underline">
                                                        {shortPropertyName(row.property.name)}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {row.averageRating.value?.toFixed(1) ?? '-'}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {row.averageRating.delta !== null
                                                        ? `${row.averageRating.delta >= 0 ? '+' : ''}${row.averageRating.delta.toFixed(1)}`
                                                        : 'n/a'}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {gap !== null ? `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}` : 'n/a'}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {row.reviewActivity.sampleSize}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    {row.lowScoreRate.value !== null
                                                        ? `${row.lowScoreRate.value.toFixed(1)}%`
                                                        : '-'}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : null}
            </QueryState>

            <QueryState
                isLoading={syncHealthQuery.isLoading}
                isError={syncHealthQuery.isError}
                error={syncHealthQuery.error}
                onRetry={() => syncHealthQuery.refetch()}
                skeleton={
                    <Card>
                        <CardHeader>
                            <CardTitle>Sync health</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-32 w-full" />
                        </CardContent>
                    </Card>
                }
            >
                {syncHealthQuery.data ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Sync health</CardTitle>
                            <CardDescription>Last scrape run per property</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Property</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Finished</TableHead>
                                        <TableHead>Inserted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {syncHealthQuery.data.latestRuns.map(({ property, run }) => (
                                        <TableRow key={property.id}>
                                            <TableCell>{shortPropertyName(property.name)}</TableCell>
                                            <TableCell>
                                                <SyncStatusBadge status={run?.status} />
                                            </TableCell>
                                            <TableCell>
                                                {run?.finishedAt
                                                    ? format(run.finishedAt, 'dd MMM yyyy, HH:mm')
                                                    : 'Never'}
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
                isLoading={recentReviewsQuery.isLoading}
                isError={recentReviewsQuery.isError}
                error={recentReviewsQuery.error}
                onRetry={() => recentReviewsQuery.refetch()}
                skeleton={
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </div>
                }
            >
                {recentReviewsQuery.data ? (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold tracking-tight">Recent evidence</h2>
                            <Link href="/reviews" className="text-sm text-primary hover:underline">
                                View all reviews
                            </Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {recentReviewsQuery.data.length === 0 ? (
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
                                recentReviewsQuery.data.map((review) => (
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

            {explainerTarget ? (
                <IssueExplainerSheet
                    open
                    onOpenChange={(open) => {
                        if (!open) setExplainerTarget(null)
                    }}
                    scope={scope}
                    propertySlug={explainerTarget.propertySlug}
                    topic={explainerTarget.topic}
                />
            ) : null}
        </div>
    )
}

function formatPropertySlug(slug: string): string {
    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}
