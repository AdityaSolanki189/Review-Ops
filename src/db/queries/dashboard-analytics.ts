import { and, asc, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { properties, reviews, reviewTopics } from '@/db/schema'
import { cachedQuery } from '@/lib/cache/cached'
import {
    calculateRate,
    createMetric,
    getSeriesGranularity,
    type AnalyticsPeriod,
    type AnalyticsScope,
    type IssueSignal,
} from '@/lib/analytics'
import { TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'

const DASHBOARD_CACHE_TTL = 300

function scopeConditions(scope: AnalyticsScope, period: AnalyticsPeriod) {
    return and(
        gte(reviews.reviewDate, period.from),
        lt(reviews.reviewDate, period.to),
        scope.property ? eq(properties.slug, scope.property) : undefined,
    )
}

function number(value: unknown): number {
    return Number(value ?? 0)
}

function scopeCacheKey(name: string, scope: AnalyticsScope): string {
    return `${name}:${scope.property ?? 'all'}:${scope.from.toISOString()}:${scope.to.toISOString()}`
}

async function getPeriodSummary(scope: AnalyticsScope, period: AnalyticsPeriod) {
    const [summary] = await db
        .select({
            averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
            reviewCount: count(),
            lowScoreCount: sql<number>`count(*) filter (where ${reviews.ratingNumeric} <= 5)`,
            latestReviewAt: sql<Date | null>`max(${reviews.reviewDate})`,
            latestScrapedAt: sql<Date | null>`max(${reviews.scrapedAt})`,
            sources: sql<string[]>`coalesce(array_agg(distinct ${reviews.source}), '{}')`,
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

async function getClassifiedReviewCount(scope: AnalyticsScope, period: AnalyticsPeriod): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(distinct ${reviewTopics.reviewId})` })
        .from(reviews)
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .innerJoin(reviewTopics, eq(reviewTopics.reviewId, reviews.id))
        .where(scopeConditions(scope, period))
    return number(row?.count)
}

async function getNegativeTopics(scope: AnalyticsScope, period: AnalyticsPeriod) {
    return db
        .select({
            topic: reviewTopics.topic,
            reviewCount: sql<number>`count(distinct ${reviewTopics.reviewId})`,
        })
        .from(reviewTopics)
        .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(and(scopeConditions(scope, period), eq(reviewTopics.sentiment, 'negative')))
        .groupBy(reviewTopics.topic)
        .orderBy(desc(sql`count(distinct ${reviewTopics.reviewId})`))
}

async function getPropertySummaries(scope: AnalyticsScope, period: AnalyticsPeriod) {
    return db
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
}

export async function getDashboardOverview(scope: AnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:overview', scope), DASHBOARD_CACHE_TTL, async () => {
        const [
            current,
            previous,
            classifiedCurrent,
            classifiedPrevious,
            currentTopics,
            propertyCurrent,
            propertyPrevious,
        ] = await Promise.all([
            getPeriodSummary(scope, scope),
            getPeriodSummary(scope, scope.previous),
            getClassifiedReviewCount(scope, scope),
            getClassifiedReviewCount(scope, scope.previous),
            getNegativeTopics(scope, scope),
            getPropertySummaries(scope, scope),
            getPropertySummaries(scope, scope.previous),
        ])

        const previousByProperty = new Map(propertyPrevious.map((row) => [row.slug, row]))
        const topTopic = currentTopics[0]
        const lowScoreRate = calculateRate(current.lowScoreCount, current.reviewCount)
        const previousLowScoreRate = calculateRate(previous.lowScoreCount, previous.reviewCount)
        const classificationCoverage = calculateRate(classifiedCurrent, current.reviewCount)
        const previousClassificationCoverage = calculateRate(classifiedPrevious, previous.reviewCount)

        return {
            scope,
            averageRating: createMetric({
                value: current.averageRating,
                previous: previous.averageRating,
                sampleSize: current.reviewCount,
                previousSampleSize: previous.reviewCount,
            }),
            reviewActivity: createMetric({
                value: current.reviewCount,
                previous: previous.reviewCount,
                sampleSize: current.reviewCount,
                previousSampleSize: previous.reviewCount,
            }),
            lowScoreRate: createMetric({
                value: lowScoreRate,
                previous: previousLowScoreRate,
                sampleSize: current.reviewCount,
                previousSampleSize: previous.reviewCount,
            }),
            topNegativeTopic: topTopic
                ? {
                      topic: topTopic.topic,
                      negativeMentionRate: calculateRate(number(topTopic.reviewCount), current.reviewCount),
                      negativeReviewShare: calculateRate(number(topTopic.reviewCount), current.lowScoreCount),
                      reviewCount: number(topTopic.reviewCount),
                  }
                : null,
            freshness: {
                latestReviewAt: current.latestReviewAt,
                latestScrapedAt: current.latestScrapedAt,
                sources: current.sources,
            },
            classificationCoverage: createMetric({
                value: classificationCoverage,
                previous: previousClassificationCoverage,
                sampleSize: current.reviewCount,
                previousSampleSize: previous.reviewCount,
            }),
            propertyComparison: propertyCurrent.map((row) => {
                const previousRow = previousByProperty.get(row.slug)
                const currentReviewCount = number(row.reviewCount)
                const previousReviewCount = number(previousRow?.reviewCount)
                return {
                    property: { slug: row.slug, name: row.name },
                    averageRating: createMetric({
                        value: row.averageRating === null ? null : number(row.averageRating),
                        previous:
                            previousRow?.averageRating === null || previousRow?.averageRating === undefined
                                ? null
                                : number(previousRow.averageRating),
                        sampleSize: currentReviewCount,
                        previousSampleSize: previousReviewCount,
                    }),
                    reviewActivity: createMetric({
                        value: currentReviewCount,
                        previous: previousRow ? previousReviewCount : null,
                        sampleSize: currentReviewCount,
                        previousSampleSize: previousReviewCount,
                    }),
                    lowScoreRate: createMetric({
                        value: calculateRate(number(row.lowScoreCount), currentReviewCount),
                        previous: previousRow
                            ? calculateRate(number(previousRow.lowScoreCount), previousReviewCount)
                            : null,
                        sampleSize: currentReviewCount,
                        previousSampleSize: previousReviewCount,
                    }),
                }
            }),
        }
    })
}

async function getIssueRows(scope: AnalyticsScope, period: AnalyticsPeriod) {
    return db
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
}

export async function getDashboardIssues(scope: AnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:issues', scope), DASHBOARD_CACHE_TTL, async () => {
        const [currentIssues, previousIssues, currentProperties, previousProperties] = await Promise.all([
            getIssueRows(scope, scope),
            getIssueRows(scope, scope.previous),
            getPropertySummaries(scope, scope),
            getPropertySummaries(scope, scope.previous),
        ])
        const previousIssueByKey = new Map(previousIssues.map((row) => [`${row.slug}:${row.topic}`, row]))
        const currentPropertyBySlug = new Map(currentProperties.map((row) => [row.slug, row]))
        const previousPropertyBySlug = new Map(previousProperties.map((row) => [row.slug, row]))

        const issues: IssueSignal[] = currentIssues.map((row) => {
            const previous = previousIssueByKey.get(`${row.slug}:${row.topic}`)
            const property = currentPropertyBySlug.get(row.slug)
            const previousProperty = previousPropertyBySlug.get(row.slug)
            const sampleSize = number(property?.reviewCount)
            const previousSampleSize = number(previousProperty?.reviewCount)
            const currentRate = calculateRate(number(row.reviewCount), sampleSize)
            const previousRate = previous ? calculateRate(number(previous.reviewCount), previousSampleSize) : null
            const metric = createMetric({
                value: currentRate,
                previous: previousRate,
                sampleSize,
                previousSampleSize,
            })

            return {
                property: { slug: row.slug, name: row.name },
                topic: row.topic,
                currentRate,
                previousRate,
                momentum: metric.delta,
                ratingGap:
                    row.averageRating === null ||
                    property?.averageRating === null ||
                    property?.averageRating === undefined
                        ? null
                        : number(row.averageRating) - number(property.averageRating),
                sampleSize,
                latestReviewAt: row.latestReviewAt,
                status: metric.status,
            }
        })

        issues.sort(
            (left, right) => (right.momentum ?? Number.NEGATIVE_INFINITY) - (left.momentum ?? Number.NEGATIVE_INFINITY),
        )
        return { scope, issues }
    })
}

export async function getDashboardTopicMatrix(scope: AnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:topic-matrix', scope), DASHBOARD_CACHE_TTL, async () => {
        const [propertyRows, totals, topicRows] = await Promise.all([
            db
                .select({ slug: properties.slug, name: properties.name })
                .from(properties)
                .where(scope.property ? eq(properties.slug, scope.property) : undefined)
                .orderBy(asc(properties.name)),
            getPropertySummaries(scope, scope),
            db
                .select({
                    slug: properties.slug,
                    topic: reviewTopics.topic,
                    negativeReviewCount: sql<number>`count(distinct ${reviewTopics.reviewId}) filter (where ${reviewTopics.sentiment} = 'negative')`,
                    classifiedReviewCount: sql<number>`count(distinct ${reviewTopics.reviewId})`,
                })
                .from(reviewTopics)
                .innerJoin(reviews, eq(reviews.id, reviewTopics.reviewId))
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(properties.slug, reviewTopics.topic),
        ])
        const totalsByProperty = new Map(totals.map((row) => [row.slug, number(row.reviewCount)]))
        const topicByProperty = new Map(topicRows.map((row) => [`${row.slug}:${row.topic}`, row]))
        const topics = Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]

        return {
            scope,
            topics,
            rows: propertyRows.map((property) => {
                const reviewCount = totalsByProperty.get(property.slug) ?? 0
                return {
                    property,
                    reviewCount,
                    cells: Object.fromEntries(
                        topics.map((topic) => {
                            const row = topicByProperty.get(`${property.slug}:${topic}`)
                            const distinctReviewCount = number(row?.negativeReviewCount)
                            return [
                                topic,
                                {
                                    negativeMentionRate: calculateRate(distinctReviewCount, reviewCount),
                                    distinctReviewCount,
                                    coverage: calculateRate(number(row?.classifiedReviewCount), reviewCount),
                                },
                            ]
                        }),
                    ),
                }
            }),
        }
    })
}

export async function getDashboardSeries(scope: AnalyticsScope) {
    return cachedQuery(scopeCacheKey('dashboard:series', scope), DASHBOARD_CACHE_TTL, async () => {
        const calendarDays = Math.round((scope.to.getTime() - scope.from.getTime()) / 86_400_000)
        const granularity = getSeriesGranularity(calendarDays)
        const bucket =
            granularity === 'day'
                ? sql<string>`to_char(date_trunc('day', ${reviews.reviewDate} at time zone 'Australia/Sydney'), 'YYYY-MM-DD')`
                : sql<string>`to_char(date_trunc('week', ${reviews.reviewDate} at time zone 'Australia/Sydney'), 'YYYY-MM-DD')`
        const [seriesRows, ratingBands] = await Promise.all([
            db
                .select({
                    bucket,
                    averageRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                    reviewCount: count(),
                })
                .from(reviews)
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(bucket)
                .orderBy(asc(bucket)),
            db
                .select({
                    band: sql<string>`case when ${reviews.ratingNumeric} <= 5 then '0-5' when ${reviews.ratingNumeric} < 8 then '5.1-7.9' else '8-10' end`,
                    reviewCount: count(),
                })
                .from(reviews)
                .innerJoin(properties, eq(properties.id, reviews.propertyId))
                .where(scopeConditions(scope, scope))
                .groupBy(
                    sql`case when ${reviews.ratingNumeric} <= 5 then '0-5' when ${reviews.ratingNumeric} < 8 then '5.1-7.9' else '8-10' end`,
                )
                .orderBy(
                    asc(
                        sql`case when ${reviews.ratingNumeric} <= 5 then 1 when ${reviews.ratingNumeric} < 8 then 2 else 3 end`,
                    ),
                ),
        ])

        return {
            scope,
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
