import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { cn } from '@/lib/utils/utils'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

export function StatCard({
    title,
    value,
    subtitle,
    delta,
}: {
    title: string
    value: string
    subtitle?: string
    delta?: number
}) {
    const DeltaIcon = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-3xl font-semibold tracking-tight">{value}</p>
                        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
                    </div>
                    {delta !== undefined ? (
                        <div
                            className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium',
                                delta > 0 && 'bg-emerald-500/10 text-emerald-600',
                                delta < 0 && 'bg-red-500/10 text-red-600',
                                delta === 0 && 'bg-muted text-muted-foreground',
                            )}
                        >
                            <DeltaIcon className="h-4 w-4" />
                            {Math.abs(delta).toFixed(1)}
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    )
}

export function StaleDataBanner() {
    return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            Data may be stale. Last sync is older than 24 hours or a recent scrape failed/was blocked. The dashboard
            continues to show the last successful dataset.
        </div>
    )
}

export function TopicBar({ topic, percentage, count }: { topic: ReviewTopicKey; percentage: number; count: number }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span>{formatTopicLabel(topic)}</span>
                <span className="text-muted-foreground">
                    {percentage}% · {count}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}

export function ReviewCard({
    propertyName,
    rating,
    title,
    excerpt,
    reviewDate,
    topics,
}: {
    propertyName: string
    rating: string
    title?: string | null
    excerpt?: string | null
    reviewDate: Date
    topics: Array<{ topic: string; sentiment: string }>
}) {
    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-medium">{propertyName}</p>
                        <p className="text-sm text-muted-foreground">
                            {reviewDate.toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                    <Badge variant="secondary">{rating} / 10</Badge>
                </div>
                {title ? <p className="font-medium">{title}</p> : null}
                {excerpt ? <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p> : null}
                {topics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {topics.map((topic) => (
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
}

export function SyncStatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) {
        return <Badge variant="outline">Never synced</Badge>
    }

    const variant =
        status === 'success'
            ? 'default'
            : status === 'blocked'
              ? 'destructive'
              : status === 'failed'
                ? 'destructive'
                : 'secondary'

    return <Badge variant={variant}>{status}</Badge>
}
