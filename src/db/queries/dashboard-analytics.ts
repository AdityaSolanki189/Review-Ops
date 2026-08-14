import { and, asc, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { properties, reviews, reviewTopics } from '@/db/schema'
import { cachedQuery } from '@/lib/cache/cached'
import { getSeriesGranularity, type AnalyticsPeriod, type ResolvedAnalyticsScope } from '@/lib/analytics'
import { mapIssueSignals, mapOverviewResponse, mapTopicMatrixResponse } from '@/lib/dashboard-analytics'

const DASHBOARD_CACHE_TTL = 300

function scopeConditions(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    return and(
        gte(reviews.reviewDate, period.from),
        lt(reviews.reviewDate, period.to),
        scope.propertySlug ? eq(properties.slug, scope.propertySlug) : undefined,
    )
}

function number(value: unknown): number {
    return Number(value ?? 0)
}

function scopeCacheKey(name: string, scope: ResolvedAnalyticsScope): string {
    return `${name}:${scope.propertySlug ?? 'all'}:${scope.public.from}:${scope.public.to}`
}

async function getPeriodSummary(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    const [summary] = await db
        .select({
            averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
            reviewCount: count(),
            lowScoreCount: sql<number>`count(*) filter (where ${reviews.ratingNumeric} <= 5)`,
            latestReviewAt: sql<Date | null>`max(${reviews.reviewDate})`,
            latestScrapedAt: sql<Date | null>`max(${reviews.scrapedAt})`,
            sources: sql<
                string[]
            >`coalesce(array_agg(distinct ${reviews.source}::text) filter (where ${reviews.source} is not null), '{}'::text[])`,
        })
        .from(reviews)
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(scopeConditions(scope, period))

    return {
        averageRating:
            summary?.averageRating === null || summary?.averageRating === undefined
                ? null
                : number(summary.averageRating),
        reviewCount: number(summary?.reviewCount),
        lowScoreCount: number(summary?.lowScoreCount),
        latestReviewAt: summary?.latestReviewAt ?? null,
        latestScrapedAt: summary?.latestScrapedAt ?? null,
        sources: summary?.sources ?? [],
    }
}

async function getClassifiedReviewCount(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(distinct ${reviewTopics.reviewId})` })
        .from(reviews)
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .innerJoin(reviewTopics, eq(reviewTopics.reviewId, reviews.id))
        .where(scopeConditions(scope, period))
    return number(row?.count)
}

async function getTopicsBySentiment(
    scope: ResolvedAnalyticsScope,
    period: AnalyticsPeriod,
    sentiment: 'negative' | 'positive',
) {
    const rows = await db
        .select({
            topic: reviewTopics.topic,
            reviewCount: sql<number>`count(distinct ${reviewTopics.reviewId})`,
        })
        .from(reviewTopics)
        .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(and(scopeConditions(scope, period), eq(reviewTopics.sentiment, sentiment)))
        .groupBy(reviewTopics.topic)
        .orderBy(desc(sql`count(distinct ${reviewTopics.reviewId})`))

    return rows.map((row) => ({ ...row, reviewCount: number(row.reviewCount) }))
}

async function getNegativeTopics(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    return getTopicsBySentiment(scope, period, 'negative')
}

async function getPositiveTopics(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    return getTopicsBySentiment(scope, period, 'positive')
}

async function getPropertySummaries(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    const rows = await db
        .select({
            slug: properties.slug,
            name: properties.name,
            averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
            reviewCount: count(),
            lowScoreCount: sql<number>`count(*) filter (where ${reviews.ratingNumeric} <= 5)`,
        })
        .from(reviews)
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(scopeConditions(scope, period))
        .groupBy(properties.slug, properties.name)
        .orderBy(asc(properties.name))

    return rows.map((row) => ({
        ...row,
        averageRating: row.averageRating === null ? null : number(row.averageRating),
        reviewCount: number(row.reviewCount),
        lowScoreCount: number(row.lowScoreCount),
    }))
}

async function getScopedProperties(scope: ResolvedAnalyticsScope) {
    return db
        .select({ slug: properties.slug, name: properties.name })
        .from(properties)
        .where(scope.propertySlug ? eq(properties.slug, scope.propertySlug) : undefined)
        .orderBy(asc(properties.name))
}

export async function getDashboardOverview(scope: ResolvedAnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:overview', scope), DASHBOARD_CACHE_TTL, async () => {
        const [
            propertyRows,
            current,
            previous,
            classifiedCurrent,
            classifiedPrevious,
            currentTopics,
            previousTopics,
            currentPositiveTopics,
            previousPositiveTopics,
            propertyCurrent,
            propertyPrevious,
        ] = await Promise.all([
            getScopedProperties(scope),
            getPeriodSummary(scope, scope),
            getPeriodSummary(scope, scope.previous),
            getClassifiedReviewCount(scope, scope),
            getClassifiedReviewCount(scope, scope.previous),
            getNegativeTopics(scope, scope),
            getNegativeTopics(scope, scope.previous),
            getPositiveTopics(scope, scope),
            getPositiveTopics(scope, scope.previous),
            getPropertySummaries(scope, scope),
            getPropertySummaries(scope, scope.previous),
        ])

        return mapOverviewResponse({
            scope,
            properties: propertyRows,
            current,
            previous,
            classifiedCurrent,
            classifiedPrevious,
            currentTopics,
            previousTopics,
            currentPositiveTopics,
            previousPositiveTopics,
            propertyCurrent,
            propertyPrevious,
        })
    })
}

async function getIssueRows(scope: ResolvedAnalyticsScope, period: AnalyticsPeriod) {
    const rows = await db
        .select({
            slug: properties.slug,
            name: properties.name,
            topic: reviewTopics.topic,
            reviewCount: sql<number>`count(distinct ${reviewTopics.reviewId})`,
            averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
            latestReviewAt: sql<Date | null>`max(${reviews.reviewDate})`,
        })
        .from(reviewTopics)
        .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(and(scopeConditions(scope, period), eq(reviewTopics.sentiment, 'negative')))
        .groupBy(properties.slug, properties.name, reviewTopics.topic)

    return rows.map((row) => ({
        ...row,
        reviewCount: number(row.reviewCount),
        averageRating: row.averageRating === null ? null : number(row.averageRating),
    }))
}

export async function getDashboardIssues(scope: ResolvedAnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:issues', scope), DASHBOARD_CACHE_TTL, async () => {
        const [currentSummary, currentIssues, previousIssues, currentProperties, previousProperties] =
            await Promise.all([
                getPeriodSummary(scope, scope),
                getIssueRows(scope, scope),
                getIssueRows(scope, scope.previous),
                getPropertySummaries(scope, scope),
                getPropertySummaries(scope, scope.previous),
            ])
        return {
            scope: scope.public,
            issues: mapIssueSignals({
                scope,
                scopeAverageRating: currentSummary.averageRating,
                currentIssues,
                previousIssues,
                currentProperties,
                previousProperties,
            }),
        }
    })
}

async function getPropertyClassificationCounts(scope: ResolvedAnalyticsScope) {
    const rows = await db
        .select({
            slug: properties.slug,
            reviewCount: sql<number>`count(distinct ${reviewTopics.reviewId})`,
        })
        .from(reviewTopics)
        .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(scopeConditions(scope, scope))
        .groupBy(properties.slug)

    return rows.map((row) => ({ ...row, reviewCount: number(row.reviewCount) }))
}

export async function getDashboardTopicMatrix(scope: ResolvedAnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:topic-matrix', scope), DASHBOARD_CACHE_TTL, async () => {
        const [propertyRows, totals, classified, rawTopicRows] = await Promise.all([
            getScopedProperties(scope),
            getPropertySummaries(scope, scope),
            getPropertyClassificationCounts(scope),
            db
                .select({
                    slug: properties.slug,
                    topic: reviewTopics.topic,
                    negativeReviewCount: sql<number>`count(distinct ${reviewTopics.reviewId}) filter (where ${reviewTopics.sentiment} = 'negative')`,
                })
                .from(reviewTopics)
                .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(properties.slug, reviewTopics.topic),
        ])
        const topicRows = rawTopicRows.map((row) => ({
            ...row,
            negativeReviewCount: number(row.negativeReviewCount),
        }))

        return mapTopicMatrixResponse({
            scope,
            properties: propertyRows,
            totals,
            classified,
            topics: topicRows,
        })
    })
}

export async function getDashboardSeries(scope: ResolvedAnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:series', scope), DASHBOARD_CACHE_TTL, async () => {
        const calendarDays = Math.round((scope.to.getTime() - scope.from.getTime()) / 86_400_000)
        const granularity = getSeriesGranularity(calendarDays)
        const bucketExpression =
            granularity === 'day'
                ? sql`to_char(date_trunc('day', timezone('Australia/Sydney', ${reviews.reviewDate})), 'YYYY-MM-DD')`
                : sql`to_char(date_trunc('week', timezone('Australia/Sydney', ${reviews.reviewDate})), 'YYYY-MM-DD')`
        const bandExpression = sql<string>`case when ${reviews.ratingNumeric} <= 5 then '0-5' when ${reviews.ratingNumeric} < 8 then '5.1-7.9' else '8-10' end`
        const [seriesRows, ratingBands] = await Promise.all([
            db
                .select({
                    bucket: sql<string>`${bucketExpression}`,
                    averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                    reviewCount: count(),
                })
                .from(reviews)
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(bucketExpression)
                .orderBy(asc(bucketExpression)),
            db
                .select({
                    band: bandExpression,
                    reviewCount: count(),
                })
                .from(reviews)
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(bandExpression)
                .orderBy(
                    asc(
                        sql`min(case when ${reviews.ratingNumeric} <= 5 then 1 when ${reviews.ratingNumeric} < 8 then 2 else 3 end)`,
                    ),
                ),
        ])

        return {
            scope: scope.public,
            granularity,
            rating: seriesRows.map((row) => ({
                bucket: row.bucket,
                value: row.averageRating === null ? null : number(row.averageRating),
                sampleSize: number(row.reviewCount),
            })),
            reviewVolume: seriesRows.map((row) => ({ bucket: row.bucket, value: number(row.reviewCount) })),
            ratingBands: ratingBands.map((row) => ({ band: row.band, reviewCount: number(row.reviewCount) })),
        }
    })
}
