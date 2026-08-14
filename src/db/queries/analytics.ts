import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/db'
import { properties, reviews, reviewTopics, scrapeRuns } from '@/db/schema'
import { cachedQuery } from '@/lib/cache/cached'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'
import { decodeReviewCursor, encodeReviewCursor, type RatingBand, type ReviewSort } from '@/lib/reviews'
import { calculateTopicSharePercentage, getSydneyWeekBounds } from '@/lib/weekly-snapshot'

const CACHE_TTL = {
    properties: 3600,
    property: 3600,
    weekly: 300,
    performance: 300,
    topicsNeg: 300,
    reviews: 120,
    topicMix: 300,
    sync: 60,
    weeklySeries: 300,
    ratingDistribution: 300,
    weeklyBriefing: 3600,
    weeklySnapshot: 300,
} as const

function startOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function weekKey(date: Date): string {
    return startOfWeek(date).toISOString().slice(0, 10)
}

function hashReviewFilters(filters: ReviewFilters): string {
    return JSON.stringify({
        propertySlug: filters.propertySlug ?? '',
        minRating: filters.minRating ?? '',
        maxRating: filters.maxRating ?? '',
        ratingBand: filters.ratingBand ?? '',
        topic: filters.topic ?? '',
        sentiment: filters.sentiment ?? '',
        from: filters.from?.toISOString() ?? '',
        to: filters.to?.toISOString() ?? '',
        limit: filters.limit ?? 20,
        cursor: filters.cursor ?? '',
        sort: filters.sort ?? 'newest',
        representative: filters.representative ?? false,
    })
}

export type EnrichedReview = Awaited<ReturnType<typeof loadRecentReviews>>['items'][number]

async function loadAllProperties() {
    return db.select().from(properties).orderBy(asc(properties.name))
}

export const getAllProperties = cache(async () => cachedQuery('properties', CACHE_TTL.properties, loadAllProperties))

async function loadPropertyBySlug(slug: string) {
    const [property] = await db.select().from(properties).where(eq(properties.slug, slug)).limit(1)
    return property ?? null
}

export async function getPropertyBySlug(slug: string) {
    return cachedQuery(`property:${slug}`, CACHE_TTL.property, () => loadPropertyBySlug(slug))
}

async function loadWeeklyStats(referenceDate: Date) {
    const thisWeekStart = startOfWeek(referenceDate)
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const [thisWeek, lastWeek] = await Promise.all([
        db
            .select({
                avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart))),
        db
            .select({
                avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(and(gte(reviews.reviewDate, lastWeekStart), lt(reviews.reviewDate, thisWeekStart))),
    ])

    const [thisWeekRow] = thisWeek
    const [lastWeekRow] = lastWeek

    return {
        thisWeek: {
            avgRating: Number(thisWeekRow?.avgRating ?? 0),
            reviewCount: Number(thisWeekRow?.reviewCount ?? 0),
        },
        lastWeek: {
            avgRating: Number(lastWeekRow?.avgRating ?? 0),
            reviewCount: Number(lastWeekRow?.reviewCount ?? 0),
        },
    }
}

export async function getWeeklyStats(referenceDate = new Date()) {
    return cachedQuery(`weekly:${weekKey(referenceDate)}`, CACHE_TTL.weekly, () => loadWeeklyStats(referenceDate))
}

async function loadPropertyPerformance(referenceDate: Date) {
    const thisWeekStart = startOfWeek(referenceDate)
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const allProperties = await getAllProperties()

    const [thisWeekStats, lastWeekStats, totalStats] = await Promise.all([
        db
            .select({
                propertyId: reviews.propertyId,
                avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart)))
            .groupBy(reviews.propertyId),
        db
            .select({
                propertyId: reviews.propertyId,
                avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
            })
            .from(reviews)
            .where(and(gte(reviews.reviewDate, lastWeekStart), lt(reviews.reviewDate, thisWeekStart)))
            .groupBy(reviews.propertyId),
        db
            .select({
                propertyId: reviews.propertyId,
                count: count(),
            })
            .from(reviews)
            .groupBy(reviews.propertyId),
    ])

    const thisWeekByProperty = new Map(thisWeekStats.map((row) => [row.propertyId, row]))
    const lastWeekByProperty = new Map(lastWeekStats.map((row) => [row.propertyId, row]))
    const totalByProperty = new Map(totalStats.map((row) => [row.propertyId, row]))

    return allProperties.map((property) => {
        const thisWeek = thisWeekByProperty.get(property.id)
        const lastWeek = lastWeekByProperty.get(property.id)
        const total = totalByProperty.get(property.id)

        return {
            property,
            avgRating: Number(thisWeek?.avgRating ?? 0),
            reviewCount: Number(thisWeek?.reviewCount ?? 0),
            delta: Number(thisWeek?.avgRating ?? 0) - Number(lastWeek?.avgRating ?? 0),
            totalReviews: Number(total?.count ?? 0),
        }
    })
}

export async function getPropertyPerformance(referenceDate = new Date()) {
    return cachedQuery(`performance:${weekKey(referenceDate)}`, CACHE_TTL.performance, () =>
        loadPropertyPerformance(referenceDate),
    )
}

async function loadNegativeTopicTrends(referenceDate: Date) {
    const thisWeekStart = startOfWeek(referenceDate)
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)

    const [negativeCountRow, topicCounts] = await Promise.all([
        db
            .select({ count: count() })
            .from(reviews)
            .where(
                and(
                    gte(reviews.reviewDate, thisWeekStart),
                    lt(reviews.reviewDate, nextWeekStart),
                    lte(reviews.ratingNumeric, '5'),
                ),
            ),
        db
            .select({
                topic: reviewTopics.topic,
                count: count(),
            })
            .from(reviewTopics)
            .innerJoin(reviews, eq(reviewTopics.reviewId, reviews.id))
            .where(
                and(
                    gte(reviews.reviewDate, thisWeekStart),
                    lt(reviews.reviewDate, nextWeekStart),
                    lte(reviews.ratingNumeric, '5'),
                    eq(reviewTopics.sentiment, 'negative'),
                ),
            )
            .groupBy(reviewTopics.topic)
            .orderBy(desc(count())),
    ])

    const negativeCount = Number(negativeCountRow[0]?.count ?? 0)
    if (negativeCount === 0) {
        return []
    }

    return topicCounts.map((row) => ({
        topic: row.topic as ReviewTopicKey,
        count: Number(row.count),
        percentage: Math.round((Number(row.count) / negativeCount) * 100),
    }))
}

export async function getNegativeTopicTrends(referenceDate = new Date()) {
    return cachedQuery(`topics:neg:${weekKey(referenceDate)}`, CACHE_TTL.topicsNeg, () =>
        loadNegativeTopicTrends(referenceDate),
    )
}

export interface WeeklySnapshotTopicInsight {
    topic: ReviewTopicKey
    count: number
    totalReviews: number
    percentage: number
}

export interface WeeklySnapshotPropertyRow {
    slug: string
    name: string
    avgRating: number | null
    previousAvgRating: number | null
    delta: number | null
    reviewCount: number
    previousReviewCount: number
}

export interface WeeklySnapshot {
    weekStart: string
    weekEnd: string
    previousWeekStart: string
    previousWeekEnd: string
    averageRating: {
        value: number | null
        previousValue: number | null
        delta: number | null
        reviewCount: number
        previousReviewCount: number
    }
    properties: WeeklySnapshotPropertyRow[]
    topNegativeTopic: WeeklySnapshotTopicInsight | null
    topPositiveTopic: WeeklySnapshotTopicInsight | null
}

async function loadTopicInsightsForPeriod(input: {
    from: Date
    toExclusive: Date
    minRating?: number
    maxRating?: number
    sentiment: ReviewSentiment
}): Promise<WeeklySnapshotTopicInsight | null> {
    const ratingConditions = []
    if (input.minRating !== undefined) {
        ratingConditions.push(gte(reviews.ratingNumeric, String(input.minRating)))
    }
    if (input.maxRating !== undefined) {
        ratingConditions.push(lte(reviews.ratingNumeric, String(input.maxRating)))
    }

    const dateConditions = and(
        gte(reviews.reviewDate, input.from),
        lt(reviews.reviewDate, input.toExclusive),
        ...ratingConditions,
    )

    const [totalReviewsRow, topTopicRows] = await Promise.all([
        db.select({ count: count() }).from(reviews).where(dateConditions),
        db
            .select({
                topic: reviewTopics.topic,
                count: count(),
            })
            .from(reviewTopics)
            .innerJoin(reviews, eq(reviewTopics.reviewId, reviews.id))
            .where(and(dateConditions, eq(reviewTopics.sentiment, input.sentiment)))
            .groupBy(reviewTopics.topic)
            .orderBy(desc(count()))
            .limit(1),
    ])

    const totalReviews = Number(totalReviewsRow[0]?.count ?? 0)
    if (totalReviews === 0) return null

    const topTopic = topTopicRows[0]
    if (!topTopic) return null

    const topicCount = Number(topTopic.count)
    const percentage = calculateTopicSharePercentage(topicCount, totalReviews)
    if (percentage === null) return null

    return {
        topic: topTopic.topic as ReviewTopicKey,
        count: topicCount,
        totalReviews,
        percentage,
    }
}

async function loadWeeklySnapshot(referenceDate: Date): Promise<WeeklySnapshot> {
    const bounds = getSydneyWeekBounds(referenceDate)
    const allProperties = await getAllProperties()

    const [thisWeekSummary, lastWeekSummary, thisWeekByProperty, lastWeekByProperty] = await Promise.all([
        db
            .select({
                avgRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(
                and(
                    gte(reviews.reviewDate, bounds.thisWeekFromUtc),
                    lt(reviews.reviewDate, bounds.thisWeekToExclusiveUtc),
                ),
            ),
        db
            .select({
                avgRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(
                and(
                    gte(reviews.reviewDate, bounds.lastWeekFromUtc),
                    lt(reviews.reviewDate, bounds.lastWeekToExclusiveUtc),
                ),
            ),
        db
            .select({
                propertyId: reviews.propertyId,
                avgRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(
                and(
                    gte(reviews.reviewDate, bounds.thisWeekFromUtc),
                    lt(reviews.reviewDate, bounds.thisWeekToExclusiveUtc),
                ),
            )
            .groupBy(reviews.propertyId),
        db
            .select({
                propertyId: reviews.propertyId,
                avgRating: sql<number | null>`avg(${reviews.ratingNumeric})`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(
                and(
                    gte(reviews.reviewDate, bounds.lastWeekFromUtc),
                    lt(reviews.reviewDate, bounds.lastWeekToExclusiveUtc),
                ),
            )
            .groupBy(reviews.propertyId),
    ])

    const thisWeekCount = Number(thisWeekSummary[0]?.reviewCount ?? 0)
    const lastWeekCount = Number(lastWeekSummary[0]?.reviewCount ?? 0)
    const thisWeekAvg =
        thisWeekCount === 0 || thisWeekSummary[0]?.avgRating === null || thisWeekSummary[0]?.avgRating === undefined
            ? null
            : Number(thisWeekSummary[0].avgRating)
    const lastWeekAvg =
        lastWeekCount === 0 || lastWeekSummary[0]?.avgRating === null || lastWeekSummary[0]?.avgRating === undefined
            ? null
            : Number(lastWeekSummary[0].avgRating)

    const thisWeekMap = new Map(thisWeekByProperty.map((row) => [row.propertyId, row]))
    const lastWeekMap = new Map(lastWeekByProperty.map((row) => [row.propertyId, row]))

    const propertyRows: WeeklySnapshotPropertyRow[] = allProperties.map((property) => {
        const current = thisWeekMap.get(property.id)
        const previous = lastWeekMap.get(property.id)
        const avgRating =
            current?.avgRating === null || current?.avgRating === undefined ? null : Number(current.avgRating)
        const previousAvgRating =
            previous?.avgRating === null || previous?.avgRating === undefined ? null : Number(previous.avgRating)
        const delta =
            avgRating !== null && previousAvgRating !== null ? Number((avgRating - previousAvgRating).toFixed(2)) : null

        return {
            slug: property.slug,
            name: property.name,
            avgRating,
            previousAvgRating,
            delta,
            reviewCount: Number(current?.reviewCount ?? 0),
            previousReviewCount: Number(previous?.reviewCount ?? 0),
        }
    })

    const [topNegativeTopic, topPositiveTopic] = await Promise.all([
        loadTopicInsightsForPeriod({
            from: bounds.thisWeekFromUtc,
            toExclusive: bounds.thisWeekToExclusiveUtc,
            maxRating: 5,
            sentiment: 'negative',
        }),
        loadTopicInsightsForPeriod({
            from: bounds.thisWeekFromUtc,
            toExclusive: bounds.thisWeekToExclusiveUtc,
            minRating: 8,
            sentiment: 'positive',
        }),
    ])

    return {
        weekStart: bounds.weekStart,
        weekEnd: bounds.weekEnd,
        previousWeekStart: bounds.previousWeekStart,
        previousWeekEnd: bounds.previousWeekEnd,
        averageRating: {
            value: thisWeekAvg,
            previousValue: lastWeekAvg,
            delta: thisWeekAvg !== null && lastWeekAvg !== null ? Number((thisWeekAvg - lastWeekAvg).toFixed(2)) : null,
            reviewCount: thisWeekCount,
            previousReviewCount: lastWeekCount,
        },
        properties: propertyRows,
        topNegativeTopic,
        topPositiveTopic,
    }
}

export async function getWeeklySnapshot(referenceDate = new Date()) {
    const bounds = getSydneyWeekBounds(referenceDate)
    return cachedQuery(`weekly-snapshot:${bounds.weekStart}`, CACHE_TTL.weeklySnapshot, () =>
        loadWeeklySnapshot(referenceDate),
    )
}

export interface ReviewFilters {
    propertySlug?: string
    minRating?: number
    maxRating?: number
    topic?: ReviewTopicKey
    sentiment?: ReviewSentiment
    ratingBand?: RatingBand
    from?: Date
    to?: Date
    limit?: number
    cursor?: string
    sort?: ReviewSort
    representative?: boolean
}

export interface ReviewsPage {
    items: Array<
        typeof reviews.$inferSelect & {
            property: typeof properties.$inferSelect
            topics: Array<typeof reviewTopics.$inferSelect>
        }
    >
    nextCursor: string | null
    filters: ReviewFilters
}

async function buildReviewConditions(filters: ReviewFilters) {
    const conditions = []

    if (filters.propertySlug) {
        const property = await loadPropertyBySlug(filters.propertySlug)
        if (property) {
            conditions.push(eq(reviews.propertyId, property.id))
        } else {
            conditions.push(sql`false`)
        }
    }

    if (filters.minRating !== undefined) {
        conditions.push(gte(reviews.ratingNumeric, String(filters.minRating)))
    }

    if (filters.maxRating !== undefined) {
        conditions.push(lte(reviews.ratingNumeric, String(filters.maxRating)))
    }

    if (filters.ratingBand === 'low') {
        conditions.push(lte(reviews.ratingNumeric, '5'))
    } else if (filters.ratingBand === 'mid') {
        conditions.push(and(gt(reviews.ratingNumeric, '5'), lt(reviews.ratingNumeric, '8')))
    } else if (filters.ratingBand === 'high') {
        conditions.push(gte(reviews.ratingNumeric, '8'))
    }

    if (filters.from) {
        conditions.push(gte(reviews.reviewDate, filters.from))
    }

    if (filters.to) {
        conditions.push(lt(reviews.reviewDate, filters.to))
    }

    if (filters.cursor) {
        const decoded = decodeReviewCursor(filters.cursor, filters.sort ?? 'newest')
        if (decoded) {
            const standardCursorCondition =
                decoded.sort === 'newest'
                    ? or(
                          lt(reviews.reviewDate, new Date(decoded.value)),
                          and(eq(reviews.reviewDate, new Date(decoded.value)), lt(reviews.id, decoded.id)),
                      )
                    : decoded.sort === 'oldest'
                      ? or(
                            gt(reviews.reviewDate, new Date(decoded.value)),
                            and(eq(reviews.reviewDate, new Date(decoded.value)), gt(reviews.id, decoded.id)),
                        )
                      : decoded.sort === 'rating-high'
                        ? or(
                              lt(reviews.ratingNumeric, decoded.value),
                              and(eq(reviews.ratingNumeric, decoded.value), lt(reviews.id, decoded.id)),
                          )
                        : or(
                              gt(reviews.ratingNumeric, decoded.value),
                              and(eq(reviews.ratingNumeric, decoded.value), gt(reviews.id, decoded.id)),
                          )

            if (filters.representative && decoded.rating && decoded.reviewDate) {
                const rank = getRepresentativeRank(filters)
                const reviewDate = new Date(decoded.reviewDate)
                conditions.push(
                    or(
                        gt(rank, decoded.rank ?? 0),
                        and(
                            eq(rank, decoded.rank ?? 0),
                            or(
                                gt(reviews.ratingNumeric, decoded.rating),
                                and(
                                    eq(reviews.ratingNumeric, decoded.rating),
                                    or(
                                        lt(reviews.reviewDate, reviewDate),
                                        and(eq(reviews.reviewDate, reviewDate), lt(reviews.id, decoded.id)),
                                    ),
                                ),
                            ),
                        ),
                    ),
                )
            } else {
                conditions.push(standardCursorCondition)
            }
        }
    }

    return conditions
}

function getRepresentativeRank(filters: ReviewFilters) {
    const topicCondition = filters.topic ? sql`and "representative_topics"."topic" = ${filters.topic}` : sql``
    return sql<number>`case when exists (
        select 1 from "review_topics" as "representative_topics"
        where "representative_topics"."review_id" = ${reviews.id}
          and "representative_topics"."sentiment" = 'negative'
          ${topicCondition}
    ) then 0 else 1 end`.as('representative_rank')
}

export async function attachTopics(
    rows: Array<{ review: typeof reviews.$inferSelect; property: typeof properties.$inferSelect }>,
) {
    const reviewIds = rows.map((row) => row.review.id)
    const allTopics =
        reviewIds.length > 0
            ? await db.select().from(reviewTopics).where(inArray(reviewTopics.reviewId, reviewIds))
            : []

    const topicsByReviewId = new Map<string, typeof allTopics>()
    for (const topic of allTopics) {
        const existing = topicsByReviewId.get(topic.reviewId) ?? []
        existing.push(topic)
        topicsByReviewId.set(topic.reviewId, existing)
    }

    return rows.map((row) => ({
        ...row.review,
        property: row.property,
        topics: topicsByReviewId.get(row.review.id) ?? [],
    }))
}

async function loadRecentReviews(filters: ReviewFilters): Promise<ReviewsPage> {
    const limit = filters.limit ?? 20
    const sort = filters.sort ?? 'newest'
    const conditions = await buildReviewConditions(filters)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const topicConditions = []
    if (filters.topic) {
        topicConditions.push(eq(reviewTopics.topic, filters.topic))
    }
    if (filters.sentiment) {
        topicConditions.push(eq(reviewTopics.sentiment, filters.sentiment))
    }

    const standardOrderBy =
        sort === 'oldest'
            ? [asc(reviews.reviewDate), asc(reviews.id)]
            : sort === 'rating-high'
              ? [desc(reviews.ratingNumeric), desc(reviews.id)]
              : sort === 'rating-low'
                ? [asc(reviews.ratingNumeric), asc(reviews.id)]
                : [desc(reviews.reviewDate), desc(reviews.id)]
    const representativeRank = filters.representative ? getRepresentativeRank(filters) : null
    const orderBy = representativeRank
        ? [asc(sql`representative_rank`), asc(reviews.ratingNumeric), desc(reviews.reviewDate), desc(reviews.id)]
        : standardOrderBy

    const rows =
        topicConditions.length > 0
            ? await db
                  .selectDistinct(
                      representativeRank
                          ? {
                                review: reviews,
                                property: properties,
                                representativeRank,
                            }
                          : {
                                review: reviews,
                                property: properties,
                            },
                  )
                  .from(reviews)
                  .innerJoin(properties, eq(reviews.propertyId, properties.id))
                  .innerJoin(reviewTopics, eq(reviewTopics.reviewId, reviews.id))
                  .where(whereClause ? and(whereClause, ...topicConditions) : and(...topicConditions))
                  .orderBy(...orderBy)
                  .limit(limit + 1)
            : await db
                  .select({
                      review: reviews,
                      property: properties,
                  })
                  .from(reviews)
                  .innerJoin(properties, eq(reviews.propertyId, properties.id))
                  .where(whereClause)
                  .orderBy(...orderBy)
                  .limit(limit + 1)

    const hasMore = rows.length > limit
    type ReviewPropertyRow = { review: typeof reviews.$inferSelect; property: typeof properties.$inferSelect }
    const pageRows: ReviewPropertyRow[] = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
        review: row.review as typeof reviews.$inferSelect,
        property: row.property as typeof properties.$inferSelect,
    }))
    const items = await attachTopics(pageRows)
    const last = items.at(-1)

    return {
        items,
        nextCursor:
            hasMore && last
                ? encodeReviewCursor({
                      sort,
                      value:
                          sort === 'rating-high' || sort === 'rating-low'
                              ? String(last.ratingNumeric)
                              : last.reviewDate.toISOString(),
                      id: last.id,
                      ...(representativeRank
                          ? {
                                rank: last.topics.some(
                                    (topic) =>
                                        topic.sentiment === 'negative' &&
                                        (!filters.topic || topic.topic === filters.topic),
                                )
                                    ? 0
                                    : 1,
                                rating: String(last.ratingNumeric),
                                reviewDate: last.reviewDate.toISOString(),
                            }
                          : {}),
                  })
                : null,
        filters,
    }
}

export async function getRecentReviews(filters: ReviewFilters = {}) {
    return cachedQuery(`reviews:${hashReviewFilters(filters)}`, CACHE_TTL.reviews, () => loadRecentReviews(filters))
}

export async function getReviewById(reviewId: string) {
    const [row] = await db
        .select({
            review: reviews,
            property: properties,
        })
        .from(reviews)
        .innerJoin(properties, eq(reviews.propertyId, properties.id))
        .where(eq(reviews.id, reviewId))
        .limit(1)

    if (!row) return null

    const [item] = await attachTopics([row])
    return item ?? null
}

async function loadWeeklyRatingSeries(referenceDate: Date, weeks = 8) {
    const endWeekStart = startOfWeek(referenceDate)
    const seriesStart = new Date(endWeekStart)
    seriesStart.setDate(seriesStart.getDate() - (weeks - 1) * 7)

    const rows = await db
        .select({
            weekStart: sql<string>`date_trunc('week', ${reviews.reviewDate})`,
            avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
            reviewCount: count(),
        })
        .from(reviews)
        .where(gte(reviews.reviewDate, seriesStart))
        .groupBy(sql`date_trunc('week', ${reviews.reviewDate})`)
        .orderBy(asc(sql`date_trunc('week', ${reviews.reviewDate})`))

    return rows.map((row) => ({
        weekStart: new Date(row.weekStart),
        avgRating: Number(row.avgRating),
        reviewCount: Number(row.reviewCount),
    }))
}

export async function getWeeklyRatingSeries(referenceDate = new Date()) {
    return cachedQuery(`weekly-series:${weekKey(referenceDate)}`, CACHE_TTL.weeklySeries, () =>
        loadWeeklyRatingSeries(referenceDate),
    )
}

async function loadRatingDistribution(referenceDate: Date) {
    const thisWeekStart = startOfWeek(referenceDate)
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)

    const rows = await db
        .select({
            rating: reviews.ratingNumeric,
            count: count(),
        })
        .from(reviews)
        .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart)))
        .groupBy(reviews.ratingNumeric)
        .orderBy(asc(reviews.ratingNumeric))

    return rows.map((row) => ({
        rating: Number(row.rating),
        count: Number(row.count),
    }))
}

export async function getRatingDistribution(referenceDate = new Date()) {
    return cachedQuery(`rating-dist:${weekKey(referenceDate)}`, CACHE_TTL.ratingDistribution, () =>
        loadRatingDistribution(referenceDate),
    )
}

async function loadLatestScrapeRuns() {
    const allProperties = await getAllProperties()

    const latestRuns = await db
        .select()
        .from(scrapeRuns)
        .where(
            sql`(${scrapeRuns.propertyId}, ${scrapeRuns.startedAt}) IN (
                SELECT property_id, MAX(started_at) FROM scrape_runs GROUP BY property_id
            )`,
        )

    const runByPropertyId = new Map(latestRuns.map((run) => [run.propertyId, run]))

    return allProperties.map((property) => ({
        property,
        run: runByPropertyId.get(property.id) ?? null,
    }))
}

export async function getLatestScrapeRuns() {
    return cachedQuery('sync:latest', CACHE_TTL.sync, loadLatestScrapeRuns)
}

async function loadScrapeRunHistory(limit: number) {
    return db
        .select({
            run: scrapeRuns,
            property: properties,
        })
        .from(scrapeRuns)
        .innerJoin(properties, eq(scrapeRuns.propertyId, properties.id))
        .orderBy(desc(scrapeRuns.startedAt))
        .limit(limit)
}

export async function getScrapeRunHistory(limit = 50) {
    return cachedQuery(`sync:history:${limit}`, CACHE_TTL.sync, () => loadScrapeRunHistory(limit))
}

export async function getSyncHealth() {
    const latestRuns = await getLatestScrapeRuns()
    const now = Date.now()
    const staleThresholdMs = 24 * 60 * 60 * 1000

    const hasBlockedOrFailed = latestRuns.some(
        (item) => item.run?.status === 'blocked' || item.run?.status === 'failed',
    )
    const isStale = latestRuns.some((item) => {
        if (!item.run?.finishedAt) return true
        return now - item.run.finishedAt.getTime() > staleThresholdMs
    })

    const totalNewReviews = latestRuns.reduce((sum, item) => sum + Number(item.run?.reviewsInserted ?? 0), 0)

    return {
        latestRuns,
        hasBlockedOrFailed,
        isStale,
        totalNewReviews,
    }
}

async function loadPropertyTopicMix(propertyId: string) {
    return db
        .select({
            topic: reviewTopics.topic,
            sentiment: reviewTopics.sentiment,
            count: count(),
        })
        .from(reviewTopics)
        .innerJoin(reviews, eq(reviewTopics.reviewId, reviews.id))
        .where(eq(reviews.propertyId, propertyId))
        .groupBy(reviewTopics.topic, reviewTopics.sentiment)
        .orderBy(desc(count()))
}

export async function getPropertyTopicMix(propertyId: string) {
    return cachedQuery(`property:${propertyId}:mix`, CACHE_TTL.topicMix, () => loadPropertyTopicMix(propertyId))
}
