'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, BarChart3, Inbox, Info, MessageSquare, Star, ThumbsDown } from 'lucide-react'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { NeedsAttentionCard } from '@/components/dashboard/needs-attention-card'
import {
    PeriodRatingTrendChart,
    RatingBandDistributionChart,
    SentimentPieChart,
} from '@/components/dashboard/dashboard-charts'
import {
    EmptyState,
    FreshnessStrip,
    MetricCard,
    PortfolioStatusStrip,
    SignalBar,
    StaleDataBanner,
} from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { IssueExplainerSheet } from '@/components/dashboard/issue-explainer-sheet'
import { SyncHealthList } from '@/components/dashboard/sync-health-list'
import { WeeklySnapshotCard } from '@/components/dashboard/weekly-snapshot-card'
import { QueryState, RefreshButton } from '@/components/query-state'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import {
    buildPortfolioStatus,
    formatMetricDelta,
    formatMetricValue,
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
    useWeeklySnapshotQuery,
} from '@/lib/queries/dashboard.queries'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'
import { cn } from '@/lib/utils/utils'

function KpiSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
        </div>
    )
}

function heatCellClass(rate: number | null): string {
    if (rate === null || rate === 0) return 'bg-muted/40 text-muted-foreground'
    if (rate >= 20) return 'bg-destructive/15 text-destructive'
    if (rate >= 10) return 'bg-warning/15 text-warning-foreground'
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
    const weeklySnapshotQuery = useWeeklySnapshotQuery()
    const invalidateCache = useInvalidateCache()

    const overview = overviewQuery.data
    const issues = issuesQuery.data?.issues ?? []
    const portfolioAvg = overview ? portfolioAverageRating(overview.propertyComparison) : null
    const statusSignals = overview ? buildPortfolioStatus(overview, issues) : []

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Portfolio performance across Azzurro Sydney properties
                    </p>
                    <QueryState
                        isLoading={overviewQuery.isLoading}
                        isError={false}
                        error={null}
                        skeleton={<Skeleton className="h-4 w-full max-w-xl" />}
                    >
                        {overview ? (
                            <FreshnessStrip
                                latestReviewAt={overview.freshness.latestReviewAt}
                                latestScrapedAt={overview.freshness.latestScrapedAt}
                                sources={overview.freshness.sources}
                                classificationCoverage={overview.classificationCoverage.value}
                                compact
                            />
                        ) : null}
                    </QueryState>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm text-muted-foreground">Updated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                    <RefreshButton onClick={() => invalidateCache.mutate()} isPending={invalidateCache.isPending} />
                </div>
            </div>

            {propertiesQuery.data ? <DashboardScopeBar properties={propertiesQuery.data} /> : null}

            {syncHealthQuery.data && (syncHealthQuery.data.isStale || syncHealthQuery.data.hasBlockedOrFailed) ? (
                <StaleDataBanner />
            ) : null}

            {/* KPI row */}
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
                            icon={Star}
                            tone="primary"
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
                            icon={MessageSquare}
                            tone="success"
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
                            icon={ThumbsDown}
                            tone="destructive"
                            invertDelta
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
                            icon={AlertTriangle}
                            tone="warning"
                            invertDelta
                        />
                    </div>
                ) : null}
            </QueryState>

            {/* Main grid: primary + right rail */}
            <div className="grid gap-6 xl:grid-cols-3">
                {/* Primary column */}
                <div className="space-y-6 xl:col-span-2">
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
                        <NeedsAttentionCard issues={issues} scope={scope} onExplain={setExplainerTarget} />
                    </QueryState>

                    <div className="grid gap-6 md:grid-cols-2">
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
                                            {seriesQuery.data.granularity === 'day' ? 'Daily' : 'Weekly'} average rating
                                            and review volume
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {seriesQuery.data.rating.length === 0 ? (
                                            <EmptyState icon={BarChart3} message="No review history in this period." />
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
                                            <EmptyState icon={BarChart3} message="No reviews in this period." />
                                        ) : (
                                            <RatingBandDistributionChart data={seriesQuery.data.ratingBands} />
                                        )}
                                    </CardContent>
                                </Card>
                            ) : null}
                        </QueryState>
                    </div>

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
                                        <EmptyState icon={Inbox} message="No topic data for this period." />
                                    ) : (
                                        <>
                                            <Accordion type="multiple" className="md:hidden">
                                                {topicMatrixQuery.data.rows.map((row) => (
                                                    <AccordionItem key={row.property.slug} value={row.property.slug}>
                                                        <AccordionTrigger className="min-h-11 py-3">
                                                            {shortPropertyName(row.property.name)}
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <ul className="space-y-2">
                                                                {topicMatrixQuery.data.topics.map((topic) => {
                                                                    const cell = row.cells[topic as ReviewTopicKey]
                                                                    const href = buildReviewsDrillDownUrl({
                                                                        scope,
                                                                        property: row.property.slug,
                                                                        topic: topic as ReviewTopicKey,
                                                                        sentiment: 'negative',
                                                                    })
                                                                    return (
                                                                        <li
                                                                            key={topic}
                                                                            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                                                                        >
                                                                            <span className="text-sm">
                                                                                {formatTopicLabel(topic)}
                                                                            </span>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    className={cn(
                                                                                        'min-h-9 rounded px-2 py-1 font-mono text-xs tabular-nums',
                                                                                        heatCellClass(
                                                                                            cell.negativeMentionRate,
                                                                                        ),
                                                                                    )}
                                                                                    onClick={() =>
                                                                                        setExplainerTarget({
                                                                                            propertySlug:
                                                                                                row.property.slug,
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
                                                                                    className="text-xs text-primary hover:underline"
                                                                                >
                                                                                    Reviews
                                                                                </Link>
                                                                            </div>
                                                                        </li>
                                                                    )
                                                                })}
                                                            </ul>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                            <Table className="hidden md:table">
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
                                                                            className={cn(
                                                                                'block min-h-9 w-full rounded px-2 py-1.5 text-center text-xs font-mono tabular-nums',
                                                                                'transition-[transform,background-color] duration-150 ease-[var(--ease-out)]',
                                                                                'active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
                                                                                heatCellClass(cell.negativeMentionRate),
                                                                            )}
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
                                                                            className="mt-1 block text-center text-xs text-primary hover:underline"
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
                                        </>
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
                                        Which negative topics correlate with the lowest scores (association, not
                                        causality)
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
                                <CardContent className="grid gap-3 md:grid-cols-2">
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
                </div>

                {/* Right rail */}
                <div className="space-y-6">
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
                        isLoading={overviewQuery.isLoading || issuesQuery.isLoading}
                        isError={overviewQuery.isError || issuesQuery.isError}
                        error={overviewQuery.error ?? issuesQuery.error}
                        onRetry={() => {
                            void overviewQuery.refetch()
                            void issuesQuery.refetch()
                        }}
                        skeleton={<Skeleton className="h-48 w-full" />}
                    >
                        {statusSignals.length > 0 ? (
                            <div>
                                <p className="mb-3 text-sm font-medium">Portfolio signals</p>
                                <PortfolioStatusStrip signals={statusSignals} orientation="vertical" />
                            </div>
                        ) : null}
                    </QueryState>

                    {overview ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Coverage</CardTitle>
                                    <CardDescription>Data quality and score mix for this period</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <SignalBar
                                        label="Classification coverage"
                                        value={
                                            overview.classificationCoverage.value === null
                                                ? 'n/a'
                                                : `${overview.classificationCoverage.value.toFixed(0)}%`
                                        }
                                        percentage={overview.classificationCoverage.value ?? 0}
                                        tone="primary"
                                    />
                                    <SignalBar
                                        label="Low-score rate"
                                        value={
                                            overview.lowScoreRate.value === null
                                                ? 'n/a'
                                                : `${overview.lowScoreRate.value.toFixed(1)}%`
                                        }
                                        percentage={overview.lowScoreRate.value ?? 0}
                                        tone="warning"
                                    />
                                    <SignalBar
                                        label="Average rating"
                                        value={
                                            overview.averageRating.value === null
                                                ? 'n/a'
                                                : `${overview.averageRating.value.toFixed(1)} / 10`
                                        }
                                        percentage={
                                            overview.averageRating.value !== null
                                                ? (overview.averageRating.value / 10) * 100
                                                : 0
                                        }
                                        tone="success"
                                    />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start gap-1">
                                        <div className="min-w-0 flex-1">
                                            <CardTitle>Sentiment</CardTitle>
                                            <CardDescription>Classified topic mention mix</CardDescription>
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                                                    aria-label="About sentiment mix"
                                                >
                                                    <Info className="size-4" aria-hidden />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs text-sm">
                                                Share of classified topic mentions in this property and period. A review
                                                with mixed topics can contribute to more than one slice.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <SentimentPieChart mix={overview.sentimentMix} />
                                </CardContent>
                            </Card>
                        </>
                    ) : null}

                    <QueryState
                        isLoading={recentReviewsQuery.isLoading}
                        isError={recentReviewsQuery.isError}
                        error={recentReviewsQuery.error}
                        onRetry={() => recentReviewsQuery.refetch()}
                        skeleton={
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-48 w-full" />
                                </CardContent>
                            </Card>
                        }
                    >
                        {recentReviewsQuery.data ? <ActivityFeed reviews={recentReviewsQuery.data} /> : null}
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
                        {syncHealthQuery.data ? <SyncHealthList data={syncHealthQuery.data} /> : null}
                    </QueryState>
                </div>
            </div>

            {/* Full-width sections */}
            <WeeklySnapshotCard
                snapshot={weeklySnapshotQuery.data}
                isLoading={weeklySnapshotQuery.isLoading}
                isError={weeklySnapshotQuery.isError}
                error={weeklySnapshotQuery.error}
                onRetry={() => weeklySnapshotQuery.refetch()}
            />

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
                        <CardContent>
                            <div className="space-y-3 md:hidden">
                                {overview.propertyComparison.map((row) => {
                                    const gap = propertyVsPortfolioGap(row.averageRating.value, portfolioAvg)
                                    const href = buildReviewsDrillDownUrl({
                                        scope,
                                        property: row.property.slug,
                                    })
                                    return (
                                        <div
                                            key={`${row.property.slug}-mobile`}
                                            className="rounded-lg border p-4 text-sm"
                                        >
                                            <Link href={href} className="font-medium hover:underline">
                                                {shortPropertyName(row.property.name)}
                                            </Link>
                                            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                                                <div>
                                                    <dt>Rating</dt>
                                                    <dd className="font-mono tabular-nums text-foreground">
                                                        {row.averageRating.value?.toFixed(1) ?? '-'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>vs previous</dt>
                                                    <dd className="font-mono tabular-nums text-foreground">
                                                        {row.averageRating.delta !== null
                                                            ? `${row.averageRating.delta >= 0 ? '+' : ''}${row.averageRating.delta.toFixed(1)}`
                                                            : 'n/a'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Reviews</dt>
                                                    <dd className="font-mono tabular-nums text-foreground">
                                                        {row.reviewActivity.sampleSize}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Low-score</dt>
                                                    <dd className="font-mono tabular-nums text-foreground">
                                                        {row.lowScoreRate.value !== null
                                                            ? `${row.lowScoreRate.value.toFixed(1)}%`
                                                            : '-'}
                                                    </dd>
                                                </div>
                                            </dl>
                                            {gap !== null ? (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    vs portfolio:{' '}
                                                    <span className="font-mono tabular-nums text-foreground">
                                                        {gap >= 0 ? '+' : ''}
                                                        {gap.toFixed(1)}
                                                    </span>
                                                </p>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="hidden overflow-x-auto md:block">
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
                                                        {gap !== null
                                                            ? `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}`
                                                            : 'n/a'}
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
                            </div>
                        </CardContent>
                    </Card>
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
