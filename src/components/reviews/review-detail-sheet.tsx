'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/dashboard-parts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useResponsiveSheetSide } from '@/hooks/use-responsive-sheet-side'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { fetchJson } from '@/lib/queries/api'
import type { ReviewListItem } from '@/lib/queries/reviews.queries'
import { cn } from '@/lib/utils/utils'

type ReviewInsight = {
    summary: string
    strengths: string[]
    issues: string[]
    suggestedAction: string
    model: string
    generatedAt: string
    cached: boolean
}

type ReviewInsightResponse = { available: true; insight: ReviewInsight } | { available: false; message: string }

async function fetchReviewInsight(reviewId: string): Promise<ReviewInsightResponse> {
    return fetchJson(`/api/reviews/${reviewId}/insight`)
}

async function generateReviewInsight(reviewId: string): Promise<ReviewInsightResponse> {
    return fetchJson(`/api/reviews/${reviewId}/insight`, { method: 'POST' })
}

function InsightBlock({ reviewId }: { reviewId: string }) {
    const queryClient = useQueryClient()
    const insightQuery = useQuery({
        queryKey: ['review-insight', reviewId],
        queryFn: () => fetchReviewInsight(reviewId),
    })

    const generateMutation = useMutation({
        mutationFn: () => generateReviewInsight(reviewId),
        onSuccess: (data) => {
            queryClient.setQueryData(['review-insight', reviewId], data)
        },
    })

    const shouldGenerate =
        insightQuery.isSuccess &&
        insightQuery.data &&
        !insightQuery.data.available &&
        insightQuery.data.message.includes('Generate one')

    useEffect(() => {
        if (shouldGenerate && !generateMutation.isPending && !generateMutation.data) {
            generateMutation.mutate()
        }
    }, [shouldGenerate, generateMutation])

    if (insightQuery.isLoading || generateMutation.isPending) {
        return (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Generating AI insight
                </div>
                <Skeleton className="h-16 w-full" />
            </div>
        )
    }

    const data = generateMutation.data ?? insightQuery.data

    if (!data) {
        return null
    }

    if (!data.available) {
        return (
            <div className="rounded-lg border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4" />
                    AI insight
                </div>
                <EmptyState message={data.message} />
                <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 w-full"
                    disabled={generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                >
                    Generate insight
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4" />
                    AI insight
                </div>
                {data.insight.cached ? (
                    <Badge variant="outline" className="font-normal">
                        Saved
                    </Badge>
                ) : null}
            </div>
            <p>{data.insight.summary}</p>
            {data.insight.strengths.length > 0 ? (
                <div>
                    <p className="mb-1 font-medium">What went well</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {data.insight.strengths.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {data.insight.issues.length > 0 ? (
                <div>
                    <p className="mb-1 font-medium">What to fix</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {data.insight.issues.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <p>
                <span className="font-medium">Suggested action:</span> {data.insight.suggestedAction}
            </p>
        </div>
    )
}

export function ReviewDetailSheet({
    review,
    open,
    onOpenChange,
}: {
    review: ReviewListItem
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const side = useResponsiveSheetSide()

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={side}
                className={cn(
                    'flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl',
                    side === 'bottom' && 'max-h-[90dvh] rounded-t-xl',
                )}
            >
                <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
                    <SheetTitle className="text-base leading-snug">{review.title ?? 'Guest review'}</SheetTitle>
                    <SheetDescription>
                        {review.property.name} · {format(new Date(review.reviewDate), 'dd MMM yyyy')} ·{' '}
                        <span className="font-mono tabular-nums">{review.rating}/10</span>
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                        {review.reviewerCountry ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Guest country</p>
                                <p>{review.reviewerCountry}</p>
                            </div>
                        ) : null}
                        {review.travellerType ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Traveller type</p>
                                <p>{review.travellerType}</p>
                            </div>
                        ) : null}
                        {review.roomType ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Room type</p>
                                <p>{review.roomType}</p>
                            </div>
                        ) : null}
                        {review.stayDate ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Stay date</p>
                                <p>{format(new Date(review.stayDate), 'dd MMM yyyy')}</p>
                            </div>
                        ) : null}
                    </div>

                    {review.topics.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {review.topics.map((topic) => (
                                <Badge
                                    key={`${topic.topic}-${topic.sentiment}`}
                                    variant={topic.sentiment === 'negative' ? 'destructive' : 'outline'}
                                >
                                    {formatTopicLabel(topic.topic as ReviewTopicKey)} · {topic.sentiment}
                                </Badge>
                            ))}
                        </div>
                    ) : null}

                    <Separator />

                    {review.positiveText ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">What went well</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{review.positiveText}</p>
                        </div>
                    ) : null}

                    {review.negativeText ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">What could improve</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{review.negativeText}</p>
                        </div>
                    ) : null}

                    {!review.positiveText && !review.negativeText ? (
                        <p className="text-sm text-muted-foreground">No review text was captured for this entry.</p>
                    ) : null}

                    <InsightBlock reviewId={review.id} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
