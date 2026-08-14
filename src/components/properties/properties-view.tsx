'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MetricCard } from '@/components/dashboard/dashboard-parts'
import { DashboardScopeBar } from '@/components/dashboard/scope-bar'
import { QueryState } from '@/components/query-state'
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
        <div className="space-y-8">
            <div>
                <p className="text-muted-foreground">Performance across the four Azzurro Sydney properties</p>
            </div>

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
                                <CardHeader>
                                    <CardTitle>{row.property.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <MetricCard
                                            title="Average rating"
                                            value={formatMetricValue(row.averageRating)}
                                            subtitle={`${row.reviewActivity.sampleSize} reviews`}
                                            delta={row.averageRating.delta}
                                            insufficient={row.averageRating.status === 'insufficient_data'}
                                        />
                                        <MetricCard
                                            title="Low-score rate"
                                            value={
                                                row.lowScoreRate.value === null
                                                    ? 'No reviews'
                                                    : `${row.lowScoreRate.value.toFixed(1)}%`
                                            }
                                            subtitle="Ratings ≤5"
                                            delta={row.lowScoreRate.delta}
                                            deltaSuffix=" pp"
                                            insufficient={row.lowScoreRate.status === 'insufficient_data'}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {formatMetricDelta(row.reviewActivity, ' reviews in period')}
                                    </p>
                                    <Link
                                        href={`/properties/${row.property.slug}?${buildScopeQueryString(scope)}`}
                                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                                    >
                                        View property intelligence
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : null}
            </QueryState>
        </div>
    )
}
