'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/dashboard/dashboard-parts'
import { InfoTip } from '@/components/dashboard/info-tip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import type { IssueSignal } from '@/lib/analytics'
import type { AnalyticsScope } from '@/lib/analytics'
import { buildReviewsDrillDownUrl } from '@/lib/dashboard-scope'
import { isAnomalyIssue } from '@/lib/dashboard-status'
import { cn } from '@/lib/utils/utils'

function GapPill({ gap }: { gap: number }) {
    const negative = gap < 0
    return (
        <span
            className={cn(
                'inline-flex rounded-md px-2 py-0.5 font-mono text-xs tabular-nums',
                negative ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground',
            )}
        >
            {gap >= 0 ? '+' : ''}
            {gap.toFixed(1)}
        </span>
    )
}

function formatPropertySlug(slug: string): string {
    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function NeedsAttentionCard({
    issues,
    scope,
    onExplain,
}: {
    issues: IssueSignal[]
    scope: AnalyticsScope
    onExplain: (target: { propertySlug: string; topic: ReviewTopicKey }) => void
}) {
    const visible = issues.slice(0, 8)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                        <CardTitle>Needs attention</CardTitle>
                        <CardDescription>Topics whose negative mentions coincide with lower scores.</CardDescription>
                    </div>
                    <InfoTip label="About needs attention">
                        Ranked by how much these topics pull ratings down. Share is how often the topic appears. Gap is
                        the score difference vs the rest of the period. Association, not a proven cause.
                    </InfoTip>
                </div>
            </CardHeader>
            <CardContent>
                {visible.length === 0 ? (
                    <EmptyState message="No major operational issue spikes detected in this period." />
                ) : (
                    <>
                        <div className="space-y-3 md:hidden">
                            {visible.map((issue) => {
                                const href = buildReviewsDrillDownUrl({
                                    scope,
                                    property: issue.propertySlug,
                                    topic: issue.topic,
                                    sentiment: 'negative',
                                    representative: true,
                                })
                                const negativeGap = issue.ratingGap !== null && issue.ratingGap < 0
                                return (
                                    <div
                                        key={`${issue.propertySlug}-${issue.topic}-mobile`}
                                        className={cn(
                                            'rounded-lg border p-4 text-sm',
                                            negativeGap && 'border-l-[3px] border-l-destructive',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium">{formatTopicLabel(issue.topic)}</p>
                                                <Link
                                                    href={href}
                                                    className="mt-0.5 block text-muted-foreground hover:underline"
                                                >
                                                    {formatPropertySlug(issue.propertySlug)} · {issue.sampleSize}{' '}
                                                    reviews
                                                </Link>
                                            </div>
                                            {issue.ratingGap !== null ? <GapPill gap={issue.ratingGap} /> : null}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                {issue.portfolioNegativeShare !== null
                                                    ? `${issue.portfolioNegativeShare.toFixed(1)}% of reviews`
                                                    : 'Share n/a'}
                                            </span>
                                            {issue.momentumPercentagePoints !== null && !isAnomalyIssue(issue) ? (
                                                <Badge variant="outline" className="font-mono text-xs tabular-nums">
                                                    {issue.momentumPercentagePoints >= 0 ? '+' : ''}
                                                    {issue.momentumPercentagePoints.toFixed(1)} pp
                                                </Badge>
                                            ) : null}
                                            {isAnomalyIssue(issue) ? (
                                                <Badge variant="destructive">Anomaly</Badge>
                                            ) : null}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 min-h-11 w-full"
                                            onClick={() =>
                                                onExplain({
                                                    propertySlug: issue.propertySlug,
                                                    topic: issue.topic,
                                                })
                                            }
                                        >
                                            Explain
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Issue</TableHead>
                                        <TableHead>
                                            <span className="inline-flex items-center gap-0.5">
                                                Share
                                                <InfoTip label="Share">
                                                    Percent of all reviews in this period that mention this topic
                                                    negatively.
                                                </InfoTip>
                                            </span>
                                        </TableHead>
                                        <TableHead>
                                            <span className="inline-flex items-center gap-0.5">
                                                Gap
                                                <InfoTip label="Rating gap">
                                                    Average rating of those reviews minus the period average. Negative
                                                    means those guests scored lower.
                                                </InfoTip>
                                            </span>
                                        </TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visible.map((issue) => {
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
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {formatTopicLabel(issue.topic)}
                                                        </p>
                                                        <Link
                                                            href={href}
                                                            className="text-sm text-muted-foreground hover:underline"
                                                        >
                                                            {formatPropertySlug(issue.propertySlug)}
                                                        </Link>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {issue.momentumPercentagePoints !== null &&
                                                            !isAnomalyIssue(issue) ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono text-xs tabular-nums text-warning"
                                                                >
                                                                    {issue.momentumPercentagePoints >= 0 ? '+' : ''}
                                                                    {issue.momentumPercentagePoints.toFixed(1)} pp
                                                                </Badge>
                                                            ) : null}
                                                            {isAnomalyIssue(issue) ? (
                                                                <Badge variant="destructive">Anomaly</Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono tabular-nums">
                                                        {issue.portfolioNegativeShare !== null
                                                            ? `${issue.portfolioNegativeShare.toFixed(1)}%`
                                                            : 'n/a'}
                                                    </span>
                                                    <span className="ml-1 text-muted-foreground">
                                                        · {issue.sampleSize} reviews
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {issue.ratingGap !== null ? (
                                                        <GapPill gap={issue.ratingGap} />
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                                                        onClick={() =>
                                                            onExplain({
                                                                propertySlug: issue.propertySlug,
                                                                topic: issue.topic,
                                                            })
                                                        }
                                                    >
                                                        Explain
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
