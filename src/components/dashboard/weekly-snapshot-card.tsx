'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { MetricCard } from '@/components/dashboard/dashboard-parts'
import { CardHeaderWithInfo } from '@/components/dashboard/info-tip'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import { buildWeeklyReviewsUrl, shortPropertyName } from '@/lib/dashboard-scope'
import type { WeeklySnapshot } from '@/lib/queries/dashboard.queries'
import { formatNegativeTopicInsight, formatPositiveTopicInsight } from '@/lib/weekly-snapshot'

function formatWeekRange(weekStart: string, weekEnd: string): string {
    const start = format(new Date(`${weekStart}T00:00:00`), 'd MMM')
    const end = format(new Date(`${weekEnd}T00:00:00`), 'd MMM yyyy')
    return `${start} – ${end}`
}

function formatDelta(delta: number | null): string {
    if (delta === null) return 'No comparison'
    const sign = delta > 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)} vs last week`
}

function WeeklySnapshotContent({ snapshot }: { snapshot: WeeklySnapshot }) {
    const reviewsUrl = buildWeeklyReviewsUrl(snapshot.weekStart, snapshot.weekEnd)

    return (
        <Card>
            <CardHeader className="gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <CardHeaderWithInfo
                        title={<CardTitle>This week</CardTitle>}
                        description={
                            <CardDescription>
                                Calendar week in Sydney time ({formatWeekRange(snapshot.weekStart, snapshot.weekEnd)})
                            </CardDescription>
                        }
                        infoLabel="About this week"
                        info={
                            <>
                                Fixed Monday to Sunday week in Australia/Sydney time. Independent of the period filter
                                above. Topic insights use keyword matching on review text.
                            </>
                        }
                    />
                    <Link
                        href={reviewsUrl}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        View this week&apos;s reviews
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                        title="Average rating"
                        value={
                            snapshot.averageRating.value === null
                                ? 'No reviews'
                                : snapshot.averageRating.value.toFixed(1)
                        }
                        subtitle={`${snapshot.averageRating.reviewCount} reviews · ${formatDelta(snapshot.averageRating.delta)}`}
                        tone="success"
                        infoLabel="About weekly average rating"
                        info={
                            <>
                                Mean guest score for the current calendar week. Compared to the previous Monday-Sunday
                                week in Sydney time.
                            </>
                        }
                    />
                    <div className="space-y-2 md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Weekly insight</p>
                        {snapshot.topNegativeTopic ? (
                            <p className="text-sm leading-relaxed">
                                {formatNegativeTopicInsight(
                                    formatTopicLabel(snapshot.topNegativeTopic.topic),
                                    snapshot.topNegativeTopic.percentage,
                                )}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No low-score reviews (≤5) this week to analyse yet.
                            </p>
                        )}
                        {snapshot.topPositiveTopic ? (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {formatPositiveTopicInsight(
                                    formatTopicLabel(snapshot.topPositiveTopic.topic),
                                    snapshot.topPositiveTopic.percentage,
                                )}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div>
                    <p className="mb-3 text-sm font-medium">Property ratings this week</p>
                    <div className="space-y-3 md:hidden">
                        {snapshot.properties.map((property) => (
                            <div key={property.slug} className="rounded-lg border p-4 text-sm">
                                <p className="font-medium">{shortPropertyName(property.name)}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                                    <span>
                                        Rating:{' '}
                                        <span className="font-mono tabular-nums text-foreground">
                                            {property.avgRating === null ? 'No reviews' : property.avgRating.toFixed(1)}
                                        </span>
                                    </span>
                                    <span>{property.reviewCount} reviews</span>
                                    {property.delta !== null ? (
                                        <Badge variant={property.delta >= 0 ? 'default' : 'destructive'}>
                                            {property.delta > 0 ? '+' : ''}
                                            {property.delta.toFixed(1)} vs last week
                                        </Badge>
                                    ) : (
                                        <span>— vs last week</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Table className="hidden md:table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Property</TableHead>
                                <TableHead>This week</TableHead>
                                <TableHead>Reviews</TableHead>
                                <TableHead>Vs last week</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshot.properties.map((property) => (
                                <TableRow key={property.slug}>
                                    <TableCell>{shortPropertyName(property.name)}</TableCell>
                                    <TableCell className="font-mono tabular-nums">
                                        {property.avgRating === null ? 'No reviews' : property.avgRating.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="font-mono tabular-nums">{property.reviewCount}</TableCell>
                                    <TableCell>
                                        {property.delta === null ? (
                                            <span className="text-muted-foreground">—</span>
                                        ) : (
                                            <Badge variant={property.delta >= 0 ? 'default' : 'destructive'}>
                                                {property.delta > 0 ? '+' : ''}
                                                {property.delta.toFixed(1)}
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <details className="rounded-lg border p-4 text-sm">
                    <summary className="cursor-pointer font-medium">How these numbers are calculated</summary>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                        <li>This week runs Monday to Sunday in Australia/Sydney time.</li>
                        <li>Negative reviews are guest scores of 5 or below.</li>
                        <li>Topic insights use keyword matching on review text, not an AI model.</li>
                        <li>Property comparisons need reviews in both weeks to show a change.</li>
                    </ul>
                </details>
            </CardContent>
        </Card>
    )
}

export function WeeklySnapshotCard({
    snapshot,
    isLoading,
    isError,
    error,
    onRetry,
}: {
    snapshot: WeeklySnapshot | undefined
    isLoading: boolean
    isError: boolean
    error: Error | null
    onRetry: () => void
}) {
    return (
        <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={onRetry}
            skeleton={
                <Card>
                    <CardHeader>
                        <CardTitle>This week</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            }
        >
            {snapshot ? <WeeklySnapshotContent snapshot={snapshot} /> : null}
        </QueryState>
    )
}
