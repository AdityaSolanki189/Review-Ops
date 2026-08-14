'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/dashboard-parts'
import { ReviewDetailSheet } from '@/components/reviews/review-detail-sheet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { shortPropertyName } from '@/lib/dashboard-scope'
import type { RecentReviews } from '@/lib/queries/dashboard.queries'
import { cn } from '@/lib/utils/utils'

function activityTone(rating: string | null): {
    icon: LucideIcon
    chipClass: string
    iconClass: string
} {
    const numeric = rating ? Number.parseFloat(rating) : 0
    if (numeric <= 5) {
        return {
            icon: ThumbsDown,
            chipClass: 'bg-destructive/10',
            iconClass: 'text-destructive',
        }
    }
    if (numeric >= 8) {
        return {
            icon: ThumbsUp,
            chipClass: 'bg-success/15',
            iconClass: 'text-success',
        }
    }
    return {
        icon: MessageSquare,
        chipClass: 'bg-primary/10',
        iconClass: 'text-primary',
    }
}

export function ActivityFeed({ reviews }: { reviews: RecentReviews }) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = reviews.find((r) => r.id === selectedId)

    if (reviews.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent activity</CardTitle>
                    <CardDescription>Latest guest reviews across the portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                    <EmptyState icon={MessageSquare} message="No reviews yet. Run pnpm scrape after seeding." />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <div>
                        <CardTitle>Recent activity</CardTitle>
                        <CardDescription>Latest guest reviews across the portfolio</CardDescription>
                    </div>
                    <Link
                        href="/reviews"
                        className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        View all
                    </Link>
                </CardHeader>
                <CardContent className="space-y-1">
                    {reviews.map((review) => {
                        const tone = activityTone(review.rating)
                        const Icon = tone.icon
                        const excerpt = review.negativeText ?? review.positiveText ?? review.title
                        const timeLabel = review.reviewDate
                            ? formatDistanceToNow(review.reviewDate, { addSuffix: true })
                            : null

                        return (
                            <button
                                key={review.id}
                                type="button"
                                onClick={() => setSelectedId(review.id)}
                                className={cn(
                                    'flex w-full min-h-11 items-start gap-3 rounded-lg p-3 text-left',
                                    'transition-[background-color,transform] duration-150 ease-[var(--ease-out)]',
                                    'hover:bg-accent/50 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100',
                                )}
                            >
                                <div className={cn('mt-0.5 shrink-0 rounded-lg p-2', tone.chipClass)}>
                                    <Icon className={cn('size-4', tone.iconClass)} aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {shortPropertyName(review.property.name)} · {review.rating}/10
                                    </p>
                                    {excerpt ? (
                                        <p className="truncate text-xs text-muted-foreground">{excerpt}</p>
                                    ) : null}
                                </div>
                                {timeLabel ? (
                                    <span className="shrink-0 text-xs text-muted-foreground">{timeLabel}</span>
                                ) : null}
                            </button>
                        )
                    })}
                </CardContent>
            </Card>
            {selected ? (
                <ReviewDetailSheet
                    review={selected}
                    open={Boolean(selectedId)}
                    onOpenChange={(open) => {
                        if (!open) setSelectedId(null)
                    }}
                />
            ) : null}
        </>
    )
}
