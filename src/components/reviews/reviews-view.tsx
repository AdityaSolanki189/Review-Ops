'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useSearchParams } from 'next/navigation'
import { EmptyState, ReviewCard } from '@/components/dashboard/dashboard-parts'
import { PageIntro } from '@/components/layout/page-intro'
import { QueryState } from '@/components/query-state'
import { ReviewFiltersForm } from '@/components/reviews/review-filters-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'
import { formatTopicLabel } from '@/lib/classification/topics'
import { shortPropertyName } from '@/lib/dashboard-scope'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'
import { useReviewsQuery, type ReviewListItem } from '@/lib/queries/reviews.queries'
import { useReviewSearchQuery } from '@/lib/queries/reviews-search.queries'

const EXAMPLE_QUERIES = [
    'guests complaining about bathrooms smelling bad',
    'late night check-in problems',
    'noisy rooms at night',
]

function formatFilterLabel(key: string, value: string, properties: Array<{ slug: string; name: string }>): string {
    switch (key) {
        case 'q':
            return `"${value}"`
        case 'property': {
            const match = properties.find((p) => p.slug === value)
            return match ? shortPropertyName(match.name) : value
        }
        case 'ratingBand':
            return { low: 'Low scores (≤5)', mid: 'Mid scores', high: 'High scores' }[value] ?? value
        case 'topic':
            return formatTopicLabel(value as ReviewTopicKey)
        case 'sentiment':
            return value.charAt(0).toUpperCase() + value.slice(1)
        case 'sort':
            return (
                {
                    newest: 'Newest first',
                    oldest: 'Oldest first',
                    'rating-high': 'Highest rating',
                    'rating-low': 'Lowest rating',
                }[value] ?? value
            )
        case 'representative':
            return 'Representative first'
        case 'minRating':
            return `Min rating ${value}`
        case 'maxRating':
            return `Max rating ${value}`
        case 'from':
            return `From ${value}`
        case 'to':
            return `To ${value}`
        default:
            return value
    }
}

export function ReviewsView() {
    const searchParams = useSearchParams()
    const searchQuery = searchParams.get('q')?.trim() ?? ''

    const params = {
        q: searchQuery || undefined,
        property: searchParams.get('property') ?? undefined,
        minRating: searchParams.get('minRating') ?? undefined,
        maxRating: searchParams.get('maxRating') ?? undefined,
        ratingBand: searchParams.get('ratingBand') ?? undefined,
        topic: searchParams.get('topic') ?? undefined,
        sentiment: searchParams.get('sentiment') ?? undefined,
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
        sort: searchParams.get('sort') ?? undefined,
        representative: searchParams.get('representative') ?? undefined,
    }

    const filterKey = {
        propertySlug: params.property,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        ratingBand: params.ratingBand as 'low' | 'mid' | 'high' | undefined,
        topic: params.topic as ReviewTopicKey | undefined,
        sentiment: params.sentiment as ReviewSentiment | undefined,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        sort: (params.sort as 'newest' | 'oldest' | 'rating-high' | 'rating-low' | undefined) ?? 'newest',
        representative: params.representative === 'true',
        limit: 20,
    }

    const searchFilters = searchQuery
        ? {
              q: searchQuery,
              propertySlug: filterKey.propertySlug,
              minRating: filterKey.minRating,
              maxRating: filterKey.maxRating,
              ratingBand: filterKey.ratingBand,
              topic: filterKey.topic,
              sentiment: filterKey.sentiment,
              from: filterKey.from,
              to: filterKey.to,
              limit: 20,
          }
        : null

    const isSearchMode = Boolean(searchQuery)
    const propertiesQuery = usePropertiesListQuery()
    const reviewsQuery = useReviewsQuery(filterKey, { enabled: !isSearchMode })
    const searchQueryResult = useReviewSearchQuery(searchFilters)

    const isLoading = propertiesQuery.isLoading || (isSearchMode ? searchQueryResult.isLoading : reviewsQuery.isLoading)
    const isError = propertiesQuery.isError || (isSearchMode ? searchQueryResult.isError : reviewsQuery.isError)
    const error = propertiesQuery.error ?? (isSearchMode ? searchQueryResult.error : reviewsQuery.error)
    const pages = reviewsQuery.data?.pages ?? []
    const listReviews = pages.flatMap((page) => page.items)
    const searchReviews = searchQueryResult.data?.items ?? []
    const reviews: Array<ReviewListItem & { similarity?: number | null }> = isSearchMode
        ? (searchReviews as Array<ReviewListItem & { similarity?: number | null }>)
        : listReviews
    const activeFilters = [...searchParams.entries()].filter(
        ([key, value]) => value && key !== 'cursor' && !(key === 'sort' && value === 'newest'),
    )
    const withoutFilter = (key: string): Route => {
        const next = new URLSearchParams(searchParams)
        next.delete(key)
        const query = next.toString()
        return (query ? `/reviews?${query}` : '/reviews') as Route
    }

    const refetchAll = () => {
        void propertiesQuery.refetch()
        if (isSearchMode) void searchQueryResult.refetch()
        else void reviewsQuery.refetch()
    }

    const properties = propertiesQuery.data ?? []

    return (
        <div className="min-w-0 space-y-6">
            <PageIntro>Browse, filter, or semantically search guest reviews</PageIntro>

            {propertiesQuery.data ? <ReviewFiltersForm properties={propertiesQuery.data} params={params} /> : null}

            <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => {
                    const next = new URLSearchParams(searchParams)
                    next.set('q', example)
                    return (
                        <Button
                            key={example}
                            variant="outline"
                            size="sm"
                            asChild
                            className="min-h-11 h-auto whitespace-normal text-left"
                        >
                            <Link href={`/reviews?${next.toString()}` as Route}>{example}</Link>
                        </Button>
                    )
                })}
            </div>

            {activeFilters.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className="font-medium text-foreground">Active filters</span>
                    {activeFilters.map(([key, value]) => (
                        <Button key={key} variant="outline" size="sm" asChild className="min-h-11 h-auto rounded-full">
                            <Link href={withoutFilter(key)}>{formatFilterLabel(key, value, properties)} ×</Link>
                        </Button>
                    ))}
                    <Button variant="link" asChild className="min-h-11 px-2">
                        <Link href="/reviews">Clear all</Link>
                    </Button>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
                {!isLoading && (isSearchMode ? searchQueryResult.data : reviewsQuery.data) ? (
                    <p className="text-sm font-medium">
                        {reviews.length === 0
                            ? '0 reviews found'
                            : `${reviews.length} review${reviews.length === 1 ? '' : 's'}${isSearchMode ? ' matched' : ' loaded'}`}
                        {activeFilters.length > 0 ? ' with filters applied' : ''}
                    </p>
                ) : (
                    <span />
                )}
                {isSearchMode && searchQueryResult.data ? (
                    <Badge variant="outline">
                        {searchQueryResult.data.mode === 'semantic'
                            ? 'Semantic search'
                            : searchQueryResult.data.reason === 'index_empty'
                              ? 'Keyword fallback (embeddings missing)'
                              : 'Keyword fallback'}
                    </Badge>
                ) : null}
            </div>

            {isSearchMode && searchQueryResult.data?.reason === 'index_empty' ? (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                    Semantic search needs review embeddings. Run <code className="font-mono">pnpm reviews:embed</code>{' '}
                    to generate them. Showing keyword matches until then.
                </p>
            ) : null}

            <QueryState
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetchAll}
                skeleton={
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                }
            >
                {(isSearchMode ? searchQueryResult.data : reviewsQuery.data) ? (
                    <>
                        <div className="grid gap-3">
                            {reviews.length === 0 ? (
                                <EmptyState
                                    message={
                                        isSearchMode && searchQueryResult.data?.reason === 'index_empty'
                                            ? 'Semantic search is not ready — review embeddings have not been generated. Run pnpm reviews:embed, then try again. No keyword matches for this query either.'
                                            : 'No reviews match these filters.'
                                    }
                                />
                            ) : (
                                reviews.map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        propertyName={review.property.name}
                                        rating={review.rating}
                                        title={review.title}
                                        excerpt={review.negativeText ?? review.positiveText}
                                        reviewDate={review.reviewDate}
                                        topics={review.topics}
                                        similarity={'similarity' in review ? review.similarity : undefined}
                                    />
                                ))
                            )}
                        </div>

                        {!isSearchMode && listReviews.length > 0 && reviewsQuery.hasNextPage ? (
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    className="min-h-11 w-full sm:w-auto"
                                    disabled={reviewsQuery.isFetchingNextPage}
                                    onClick={() => void reviewsQuery.fetchNextPage()}
                                >
                                    {reviewsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </QueryState>
        </div>
    )
}
