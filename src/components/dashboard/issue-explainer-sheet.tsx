'use client'

import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsScope } from '@/lib/analytics'
import type { IssueExplainerResult } from '@/lib/ai/issue-explainer'
import { formatTopicLabel, type ReviewTopicKey } from '@/lib/classification/topics'
import { buildDashboardApiUrl } from '@/lib/dashboard-scope'
import { fetchJson } from '@/lib/queries/api'
import { useReviewsQuery } from '@/lib/queries/reviews.queries'

interface IssueExplainerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    scope: AnalyticsScope
    propertySlug: string
    topic: ReviewTopicKey
}

function formatPropertySlug(slug: string): string {
    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

async function fetchIssueExplainer(input: {
    scope: AnalyticsScope
    propertySlug: string
    topic: ReviewTopicKey
}): Promise<IssueExplainerResult> {
    const url = buildDashboardApiUrl(`/api/dashboard/issues/${input.propertySlug}/${input.topic}/explain`, input.scope)
    return fetchJson(url, { method: 'POST' })
}

export function IssueExplainerSheet({ open, onOpenChange, scope, propertySlug, topic }: IssueExplainerSheetProps) {
    const { mutate, isPending, data, isError, error } = useMutation({
        mutationKey: ['issue-explainer', propertySlug, topic, scope],
        mutationFn: () => fetchIssueExplainer({ scope, propertySlug, topic }),
    })

    const evidenceQuery = useReviewsQuery(
        {
            propertySlug,
            topic,
            sentiment: 'negative',
            from: scope.from ? new Date(scope.from) : undefined,
            to: scope.to ? new Date(scope.to) : undefined,
            representative: true,
            sort: 'rating-low',
            limit: 8,
        },
        { enabled: open },
    )

    const fetchKey = `${propertySlug}:${topic}:${scope.from}:${scope.to}:${scope.compare}:${scope.timezone}`

    // biome-ignore lint/correctness/useExhaustiveDependencies: refetch explainer when drawer target or scope changes
    useEffect(() => {
        if (open) {
            mutate()
        }
    }, [open, fetchKey, mutate])

    const propertyName = evidenceQuery.data?.pages[0]?.items[0]?.property.name ?? formatPropertySlug(propertySlug)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
                <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
                    <SheetTitle className="text-base leading-snug">
                        {formatTopicLabel(topic)} at {propertyName}
                    </SheetTitle>
                    <SheetDescription>AI-assisted breakdown with verifiable guest excerpts below.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <QueryState
                        isLoading={isPending}
                        isError={isError}
                        error={error}
                        onRetry={() => mutate()}
                        skeleton={
                            <div className="space-y-4">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        }
                    >
                        <div className="space-y-6">
                            {data?.available ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">
                                            {data.source === 'ai' ? 'AI analysis' : 'Deterministic summary'}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {data.reviewCount} representative reviews
                                        </span>
                                    </div>

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-medium">Themes</h3>
                                        <ul className="space-y-4 text-sm">
                                            {data.themes.map((theme) => (
                                                <li key={theme.label} className="space-y-2">
                                                    <p className="font-medium">
                                                        {theme.label}
                                                        <span className="font-normal text-muted-foreground">
                                                            {' '}
                                                            · {theme.mentionCount} mentions
                                                        </span>
                                                    </p>
                                                    <p className="text-muted-foreground italic">
                                                        &ldquo;{theme.exampleQuote}&rdquo;
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="space-y-2">
                                        <h3 className="text-sm font-medium">Likely causes</h3>
                                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                                            {data.rootCauseHypotheses.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="space-y-2">
                                        <h3 className="text-sm font-medium">Recommended actions</h3>
                                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                                            {data.recommendedActions.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </section>
                                </>
                            ) : data && !data.available ? (
                                <p className="text-sm text-muted-foreground">{data.message}</p>
                            ) : null}

                            {evidenceQuery.isLoading ? (
                                <section className="space-y-3">
                                    <h3 className="text-sm font-medium">Representative reviews</h3>
                                    <Skeleton className="h-28 w-full" />
                                    <Skeleton className="h-28 w-full" />
                                </section>
                            ) : evidenceQuery.data?.pages[0]?.items.length ? (
                                <section className="space-y-3 border-t pt-6">
                                    <h3 className="text-sm font-medium">Representative reviews</h3>
                                    <div className="space-y-3">
                                        {evidenceQuery.data.pages[0].items.map((review) => (
                                            <ReviewCard
                                                key={review.id}
                                                compact
                                                review={review}
                                                propertyName={review.property.name}
                                                rating={review.rating}
                                                title={review.title}
                                                excerpt={review.negativeText ?? review.positiveText}
                                                reviewDate={review.reviewDate}
                                                topics={review.topics}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    </QueryState>
                </div>
            </SheetContent>
        </Sheet>
    )
}
