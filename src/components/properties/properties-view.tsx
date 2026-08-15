'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowDown, Star, ThumbsDown } from 'lucide-react'
import { SignalBar } from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { PageIntro } from '@/components/layout/page-intro'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buildScopeQueryString, resolveScopeFromSearchParams, shortPropertyName } from '@/lib/dashboard-scope'
import { formatMetricValue } from '@/lib/dashboard-status'
import { useDashboardOverviewQuery } from '@/lib/queries/dashboard.queries'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'
import { cn } from '@/lib/utils/utils'

const SentimentPieChart = dynamic(
    () => import('@/components/dashboard/dashboard-charts').then((module) => module.SentimentPieChart),
    { ssr: false, loading: () => <Skeleton className="size-20 rounded-full" /> },
)

const propertySurfaceHoverClass =
    'transition-[transform,box-shadow] duration-160 ease-[var(--ease-out)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-px [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0'

function formatReviewActivityDelta(
    delta: number | null,
): { value: string; tone: 'success' | 'destructive' | 'muted' } | null {
    if (delta === null) return null
    const sign = delta >= 0 ? '+' : ''
    return {
        value: `${sign}${Math.round(delta)}`,
        tone: delta > 0 ? 'success' : delta < 0 ? 'destructive' : 'muted',
    }
}

export function PropertiesView() {
    const searchParams = useSearchParams()
    const scope = resolveScopeFromSearchParams(searchParams)
    const propertiesQuery = usePropertiesListQuery()
    const overviewQuery = useDashboardOverviewQuery(scope)

    return (
        <div className="min-w-0 space-y-6">
            <PageIntro>Performance across the four Azzurro Sydney properties</PageIntro>

            {propertiesQuery.data ? <DashboardScopeBar properties={propertiesQuery.data} /> : null}

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => void overviewQuery.refetch()}
                skeleton={
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-72 rounded-xl" />
                        <Skeleton className="h-72 rounded-xl" />
                        <Skeleton className="h-72 rounded-xl" />
                        <Skeleton className="h-72 rounded-xl" />
                    </div>
                }
            >
                {overviewQuery.data ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {overviewQuery.data.propertyComparison.map((row) => {
                            const activityDelta = formatReviewActivityDelta(row.reviewActivity.delta)
                            const lowScoreHigh = row.lowScoreRate.value !== null && row.lowScoreRate.value > 20
                            const ratingDisplay = formatMetricValue(row.averageRating)
                            const hasReviews = row.reviewActivity.sampleSize > 0

                            return (
                                <Card
                                    key={row.property.slug}
                                    className={cn(
                                        'flex h-full flex-col gap-0 bg-primary/5 py-0',
                                        propertySurfaceHoverClass,
                                    )}
                                >
                                    <CardHeader className="flex flex-col gap-3 border-b px-5 py-4 [.border-b]:pb-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="text-xl">
                                                {shortPropertyName(row.property.name)}
                                            </CardTitle>
                                            <ThumbsDown
                                                className={cn(
                                                    'size-4 shrink-0',
                                                    lowScoreHigh ? 'text-destructive' : 'text-muted-foreground',
                                                )}
                                                aria-hidden
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                                            <span className="inline-flex shrink-0 items-center gap-1.5">
                                                <Star className="size-4 text-success" aria-hidden />
                                                <span
                                                    className={cn(
                                                        'font-mono font-semibold tabular-nums',
                                                        hasReviews ? 'text-success' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {ratingDisplay}
                                                </span>
                                            </span>
                                            <span className="inline-flex shrink-0 items-center text-foreground">
                                                avg · {row.reviewActivity.sampleSize}{' '}
                                                {row.reviewActivity.sampleSize === 1 ? 'review' : 'reviews'}
                                            </span>
                                            {row.lowScoreRate.value === null ? (
                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                                    <span className="font-bold text-destructive">—</span>
                                                    low-score
                                                </span>
                                            ) : (
                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-foreground">
                                                    <ArrowDown
                                                        className={cn(
                                                            'size-3',
                                                            lowScoreHigh ? 'text-destructive' : 'text-muted-foreground',
                                                        )}
                                                        aria-hidden
                                                    />
                                                    <span
                                                        className={cn(
                                                            'font-mono font-semibold tabular-nums',
                                                            lowScoreHigh ? 'text-destructive' : 'text-foreground',
                                                        )}
                                                    >
                                                        {row.lowScoreRate.value.toFixed(1)}%
                                                    </span>
                                                    <span>low-score</span>
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col p-5">
                                        <div className="grid flex-1 grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Sentiment</span>
                                                <div className="mt-1 min-h-8 text-xs leading-tight">
                                                    {activityDelta ? (
                                                        <>
                                                            <span
                                                                className={cn(
                                                                    'font-mono font-medium tabular-nums',
                                                                    activityDelta.tone === 'success' && 'text-success',
                                                                    activityDelta.tone === 'destructive' &&
                                                                        'text-destructive',
                                                                    activityDelta.tone === 'muted' &&
                                                                        'text-muted-foreground',
                                                                )}
                                                            >
                                                                {activityDelta.value}
                                                            </span>
                                                            <br />
                                                            <span className="text-[10px] text-muted-foreground">
                                                                vs previous
                                                            </span>
                                                        </>
                                                    ) : null}
                                                </div>
                                                <div className="flex min-h-24 flex-1 items-center justify-center">
                                                    <SentimentPieChart mix={row.sentimentMix} compact />
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Classified</span>
                                                <div className="mt-1 min-h-8" aria-hidden />
                                                <div className="flex min-h-24 flex-1 items-center">
                                                    <SignalBar
                                                        label="Classified"
                                                        hideLabel
                                                        value={
                                                            row.classificationCoverage === null
                                                                ? 'n/a'
                                                                : `${row.classificationCoverage.toFixed(0)}%`
                                                        }
                                                        percentage={row.classificationCoverage ?? 0}
                                                        tone="primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button asChild className="mt-4 min-h-11 w-full">
                                            <Link
                                                href={`/properties/${row.property.slug}?${buildScopeQueryString(scope)}`}
                                            >
                                                View property
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : null}
            </QueryState>
        </div>
    )
}
