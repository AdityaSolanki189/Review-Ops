'use client'

import { useMutation } from '@tanstack/react-query'
import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type { AnalyticsScope } from '@/lib/analytics'
import { formatTopicLabel, type ReviewTopicKey } from '@/lib/classification/topics'
import { buildDashboardApiUrl } from '@/lib/dashboard-scope'
import { fetchJson } from '@/lib/queries/api'
import type { IssueExplainerResult } from '@/lib/ai/issue-explainer'
import { useReviewsQuery } from '@/lib/queries/reviews.queries'

interface IssueExplainerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    scope: AnalyticsScope
    propertySlug: string
    topic: ReviewTopicKey
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
    const explainerMutation = useMutation({
        mutationKey: ['issue-explainer', propertySlug, topic, scope],
        mutationFn: () => fetchIssueExplainer({ scope, propertySlug, topic }),
    })

    const evidenceQuery = useReviewsQuery({
        propertySlug,
        topic,
        sentiment: 'negative',
        from: scope.from ? new Date(scope.from) : undefined,
        to: scope.to ? new Date(scope.to) : undefined,
        representative: true,
        sort: 'rating-low',
        limit: 8,
    })

    if (open && !explainerMutation.isPending && !explainerMutation.data && !explainerMutation.isError) {
        void explainerMutation.mutate()
    }

    const data = explainerMutation.data

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>
                        {formatTopicLabel(topic)} at {propertySlug.replace(/-/g, ' ')}
                    </SheetTitle>
                    <SheetDescription>AI-assisted breakdown with verifiable guest excerpts below.</SheetDescription>
                </SheetHeader>

                <QueryState
                    isLoading={explainerMutation.isPending}
                    isError={explainerMutation.isError}
                    error={explainerMutation.error}
                    onRetry={() => explainerMutation.mutate()}
                    skeleton={<Skeleton className="mt-6 h-40 w-full" />}
                >
                    {data?.available ? (
                        <div className="mt-6 space-y-6">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    {data.source === 'ai' ? 'AI analysis' : 'Deterministic summary'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {data.reviewCount} representative reviews
                                </span>
                            </div>

                            <section className="space-y-3">
                                <h3 className="font-medium">Themes</h3>
                                <ul className="space-y-3 text-sm">
                                    {data.themes.map((theme) => (
                                        <li key={theme.label} className="rounded-lg border p-3">
                                            <p className="font-medium">
                                                {theme.label} · {theme.mentionCount} mentions
                                            </p>
                                            <p className="mt-2 text-muted-foreground">
                                                &ldquo;{theme.exampleQuote}&rdquo;
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-medium">Likely causes</h3>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                    {data.rootCauseHypotheses.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-medium">Recommended actions</h3>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                    {data.recommendedActions.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    ) : data && !data.available ? (
                        <p className="mt-6 text-sm text-muted-foreground">{data.message}</p>
                    ) : null}

                    {evidenceQuery.data?.pages[0]?.items.length ? (
                        <section className="mt-8 space-y-3">
                            <h3 className="font-medium">Representative reviews</h3>
                            <div className="space-y-3">
                                {evidenceQuery.data.pages[0].items.map((review) => (
                                    <ReviewCard
                                        key={review.id}
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
                </QueryState>
            </SheetContent>
        </Sheet>
    )
}
