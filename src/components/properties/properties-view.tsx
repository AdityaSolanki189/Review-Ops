'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ThumbsDown, Star } from 'lucide-react'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { PageIntro } from '@/components/layout/page-intro'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buildScopeQueryString, resolveScopeFromSearchParams, shortPropertyName } from '@/lib/dashboard-scope'
import { formatMetricDelta, formatMetricValue } from '@/lib/dashboard-status'
import { useDashboardOverviewQuery } from '@/lib/queries/dashboard.queries'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'

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
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                    </div>
                }
            >
                {overviewQuery.data ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {overviewQuery.data.propertyComparison.map((row) => (
                            <Card key={row.property.slug}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{shortPropertyName(row.property.name)}</CardTitle>
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
                                    <p className="text-sm text-muted-foreground">
                                        {formatMetricDelta(row.reviewActivity, ' reviews in period')}
                                    </p>
                                    <Button asChild className="min-h-11 w-full sm:w-auto">
                                        <Link href={`/properties/${row.property.slug}?${buildScopeQueryString(scope)}`}>
                                            View property
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : null}
            </QueryState>
        </div>
    )
}
