'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ReviewDetailSheet } from '@/components/reviews/review-detail-sheet'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import type { ReviewListItem } from '@/lib/queries/reviews.queries'
import { cn } from '@/lib/utils/utils'

type MetricTone = 'primary' | 'success' | 'warning' | 'destructive'

const toneChipClass: Record<MetricTone, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning-foreground',
    destructive: 'bg-destructive/10 text-destructive',
}

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
                    'cursor-pointer transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:border-primary/30 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100',
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
    icon: Icon,
    tone = 'primary',
    invertDelta,
}: {
    title: string
    value: string
    subtitle?: string
    delta?: number | null
    deltaSuffix?: string
    insufficient?: boolean
    icon?: LucideIcon
    tone?: MetricTone
    /** When true, negative delta is shown as positive (e.g. low-score rate) */
    invertDelta?: boolean
}) {
    const showDelta = delta !== null && delta !== undefined && !insufficient
    const isPositive = showDelta && (invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0)
    const isNegative = showDelta && (invertDelta ? (delta ?? 0) > 0 : (delta ?? 0) < 0)
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : null

    return (
        <Card className="transition-shadow duration-200 ease-[var(--ease-out)] hover:shadow-sm motion-reduce:transition-none">
            <CardContent className="space-y-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                    {Icon ? (
                        <div className={cn('rounded-lg p-2', toneChipClass[tone])}>
                            <Icon className="size-5" aria-hidden />
                        </div>
                    ) : (
                        <div />
                    )}
                    {TrendIcon ? (
                        <TrendIcon
                            className={cn(
                                'size-4 shrink-0',
                                isPositive && 'text-success',
                                isNegative && 'text-destructive',
                            )}
                            aria-hidden
                        />
                    ) : null}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="mt-1 flex items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
                            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
                        </div>
                        {showDelta ? (
                            <Badge
                                variant={isPositive ? 'default' : isNegative ? 'destructive' : 'outline'}
                                className={cn(
                                    'font-mono tabular-nums',
                                    isPositive && 'border-success/30 bg-success/10 text-success',
                                )}
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
                </div>
            </CardContent>
        </Card>
    )
}

export function SignalBar({
    label,
    value,
    percentage,
    tone = 'primary',
}: {
    label: string
    value: string
    percentage: number
    tone?: MetricTone
}) {
    const fillClass: Record<MetricTone, string> = {
        primary: 'bg-primary',
        success: 'bg-success',
        warning: 'bg-warning',
        destructive: 'bg-destructive',
    }

    const clamped = Math.min(100, Math.max(0, percentage))

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium tabular-nums">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        'h-full origin-left rounded-full transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none',
                        fillClass[tone],
                    )}
                    style={{ transform: `scaleX(${clamped / 100})` }}
                />
            </div>
        </div>
    )
}

export function PortfolioStatusStrip({
    signals,
    orientation = 'grid',
}: {
    signals: Array<{ kind: string; label: string; value: string; detail?: string; insufficient?: boolean }>
    orientation?: 'grid' | 'vertical'
}) {
    if (signals.length === 0) return null

    if (orientation === 'vertical') {
        return (
            <div className="divide-y rounded-lg border bg-card">
                {signals.map((signal) => (
                    <div key={`${signal.kind}-${signal.label}`} className="px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {signal.label}
                        </p>
                        <p className="mt-1 font-semibold tracking-tight">{signal.value}</p>
                        {signal.detail ? <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p> : null}
                    </div>
                ))}
            </div>
        )
    }

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

export function EmptyState({ icon: Icon, message }: { icon?: LucideIcon; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            {Icon ? <Icon className="size-8 text-muted-foreground/50" aria-hidden /> : null}
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    )
}

export function FreshnessStrip({
    latestReviewAt,
    latestScrapedAt,
    sources,
    classificationCoverage,
    compact,
}: {
    latestReviewAt: string | null
    latestScrapedAt: string | null
    sources: string[]
    classificationCoverage: number | null
    compact?: boolean
}) {
    const reviewLabel = latestReviewAt
        ? new Date(latestReviewAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'None'
    const scrapedLabel = latestScrapedAt
        ? new Date(latestScrapedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Unknown'

    return (
        <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
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
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
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
                    className="h-full origin-left rounded-full bg-primary transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none"
                    style={{ transform: `scaleX(${Math.min(100, Math.max(0, percentage)) / 100})` }}
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
