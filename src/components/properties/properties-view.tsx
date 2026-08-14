'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ThumbsDown, Star } from 'lucide-react'
import { SentimentPieChart } from '@/components/dashboard/dashboard-charts'
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

function formatActivityDelta(delta: number | null): string | null {
    if (delta === null) return null
    const sign = delta >= 0 ? '+' : ''
    return `${sign}${Math.round(delta)} vs previous`
}

export function PropertiesView() {
    const searchParams = useSearchParams()
    const scope = resolveScopeFromSearchParams(searchParams)
    const propertiesQuery = usePropertiesListQuery()
    const overviewQuery = useDashboardOverviewQuery(scope)

    return (
        <div className="space-y-6">
            <PageIntro>Performance across the four Azzurro Sydney properties</PageIntro>

            {propertiesQuery.data ? <DashboardScopeBar properties={propertiesQuery.data} /> : null}

            <QueryState
                isLoading={overviewQuery.isLoading}
                isError={overviewQuery.isError}
                error={overviewQuery.error}
                onRetry={() => void overviewQuery.refetch()}
                skeleton={
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                    </div>
                }
            >
                {overviewQuery.data ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {overviewQuery.data.propertyComparison.map((row) => {
                            const activityDelta = formatActivityDelta(row.reviewActivity.delta)
                            return (
                                <Card
                                    key={row.property.slug}
                                    className="transition-colors duration-150 ease-[var(--ease-out)] hover:border-primary/20 motion-reduce:transition-none"
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                            {shortPropertyName(row.property.name)}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Star className="size-4 text-success" aria-hidden />
                                                <span className="font-mono text-lg font-semibold tabular-nums">
                                                    {formatMetricValue(row.averageRating)}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    avg · {row.reviewActivity.sampleSize} reviews
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ThumbsDown className="size-4 text-warning" aria-hidden />
                                                <span className="font-mono font-semibold tabular-nums">
                                                    {row.lowScoreRate.value === null
                                                        ? '—'
                                                        : `${row.lowScoreRate.value.toFixed(1)}%`}
                                                </span>
                                                <span className="text-muted-foreground">low-score</span>
                                            </div>
                                        </div>
                                        {row.reviewActivity.sampleSize === 0 ? (
                                            <p className="text-sm text-muted-foreground">No reviews in this period</p>
                                        ) : activityDelta ? (
                                            <p className="text-sm text-muted-foreground">{activityDelta}</p>
                                        ) : null}
                                        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs text-muted-foreground">Sentiment</span>
                                                <SentimentPieChart mix={row.sentimentMix} compact />
                                            </div>
                                            <SignalBar
                                                label="Classified"
                                                value={
                                                    row.classificationCoverage === null
                                                        ? 'n/a'
                                                        : `${row.classificationCoverage.toFixed(0)}%`
                                                }
                                                percentage={row.classificationCoverage ?? 0}
                                                tone="primary"
                                            />
                                        </div>
                                        <Button asChild className="min-h-11 w-full sm:w-auto">
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
