'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ReviewDetailSheet } from '@/components/reviews/review-detail-sheet'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import type { ReviewListItem } from '@/lib/queries/reviews.queries'
import { cn } from '@/lib/utils/utils'

type ReviewCardProps = {
    propertyName: string
    rating?: string
    title?: string | null
    excerpt?: string | null
    reviewDate?: Date
    topics?: Array<{ topic: string; sentiment: string }>
    review?: ReviewListItem
    onSelect?: () => void
}

export function ReviewCard({
    propertyName,
    rating,
    title,
    excerpt,
    reviewDate,
    topics,
    review,
    onSelect,
}: ReviewCardProps) {
    const [open, setOpen] = useState(false)
    const interactive = Boolean(review)
    const resolvedRating = rating ?? review?.rating ?? '—'
    const resolvedReviewDate = reviewDate ?? review?.reviewDate
    const resolvedTitle = title ?? review?.title
    const resolvedExcerpt = excerpt ?? review?.negativeText ?? review?.positiveText
    const resolvedTopics = topics ?? review?.topics ?? []

    const card = (
        <Card
            className={cn(
                interactive &&
                    'cursor-pointer transition-transform duration-150 ease-out hover:border-primary/30 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100',
            )}
            onClick={
                interactive
                    ? () => {
                          onSelect?.()
                          setOpen(true)
                      }
                    : undefined
            }
            onKeyDown={
                interactive
                    ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onSelect?.()
                              setOpen(true)
                          }
                      }
                    : undefined
            }
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
        >
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-medium">{propertyName}</p>
                        <p className="text-sm text-muted-foreground">
                            {resolvedReviewDate
                                ? resolvedReviewDate.toLocaleDateString('en-AU', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                  })
                                : '—'}
                        </p>
                    </div>
                    <Badge variant="secondary" className="font-mono tabular-nums">
                        {resolvedRating} / 10
                    </Badge>
                </div>
                {resolvedTitle ? <p className="font-medium">{resolvedTitle}</p> : null}
                {resolvedExcerpt ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{resolvedExcerpt}</p>
                ) : null}
                {resolvedTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {resolvedTopics.map((topic) => (
                            <Badge
                                key={`${topic.topic}-${topic.sentiment}`}
                                variant={topic.sentiment === 'negative' ? 'destructive' : 'outline'}
                            >
                                {formatTopicLabel(topic.topic as ReviewTopicKey)} · {topic.sentiment}
                            </Badge>
                        ))}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )

    return (
        <>
            {card}
            {review ? <ReviewDetailSheet review={review} open={open} onOpenChange={setOpen} /> : null}
        </>
    )
}

export function MetricCard({
    title,
    value,
    subtitle,
    delta,
    deltaSuffix = '',
    insufficient,
}: {
    title: string
    value: string
    subtitle?: string
    delta?: number | null
    deltaSuffix?: string
    insufficient?: boolean
}) {
    const showDelta = delta !== null && delta !== undefined && !insufficient

    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
                        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
                    </div>
                    {showDelta ? (
                        <Badge
                            variant={delta > 0 ? 'default' : delta < 0 ? 'destructive' : 'outline'}
                            className="font-mono tabular-nums"
                        >
                            {delta >= 0 ? '+' : ''}
                            {delta.toFixed(1)}
                            {deltaSuffix}
                        </Badge>
                    ) : insufficient ? (
                        <Badge variant="outline" className="text-xs">
                            Not enough data
                        </Badge>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    )
}

export function PortfolioStatusStrip({
    signals,
}: {
    signals: Array<{ kind: string; label: string; value: string; detail?: string; insufficient?: boolean }>
}) {
    if (signals.length === 0) return null

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal) => (
                <div key={`${signal.kind}-${signal.label}`} className="rounded-lg border bg-card px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{signal.label}</p>
                    <p className="mt-1 font-semibold tracking-tight">{signal.value}</p>
                    {signal.detail ? <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p> : null}
                </div>
            ))}
        </div>
    )
}

export function FreshnessStrip({
    latestReviewAt,
    latestScrapedAt,
    sources,
    classificationCoverage,
}: {
    latestReviewAt: string | null
    latestScrapedAt: string | null
    sources: string[]
    classificationCoverage: number | null
}) {
    const reviewLabel = latestReviewAt
        ? new Date(latestReviewAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'None'
    const scrapedLabel = latestScrapedAt
        ? new Date(latestScrapedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown'

    return (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
                Latest review: <strong className="text-foreground">{reviewLabel}</strong>
            </span>
            <span>
                Last scrape: <strong className="text-foreground">{scrapedLabel}</strong>
            </span>
            <span>
                Source: <strong className="text-foreground">{sources.join(', ') || 'booking.com'}</strong>
            </span>
            <span>
                Classification:{' '}
                <strong className="text-foreground">
                    {classificationCoverage === null ? 'n/a' : `${classificationCoverage.toFixed(0)}%`}
                </strong>
            </span>
        </div>
    )
}

export function StaleDataBanner() {
    return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            Data may be stale. Last sync is older than 24 hours or a recent scrape failed or was blocked. The dashboard
            continues to show the last successful dataset.
        </div>
    )
}

export function TopicBar({ topic, percentage, count }: { topic: ReviewTopicKey; percentage: number; count: number }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span>{formatTopicLabel(topic)}</span>
                <span className="font-mono text-muted-foreground tabular-nums">
                    {percentage}% · {count}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

export function SyncStatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) {
        return <Badge variant="outline">Never synced</Badge>
    }

    const variant =
        status === 'success' ? 'default' : status === 'blocked' || status === 'failed' ? 'destructive' : 'secondary'

    return <Badge variant={variant}>{status}</Badge>
}
