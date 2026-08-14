import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/db'
import { properties, reviews, reviewTopics, scrapeRuns } from '@/db/schema'
import { cachedQuery } from '@/lib/cache/cached'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'
import { decodeReviewCursor, encodeReviewCursor, type RatingBand, type ReviewSort } from '@/lib/reviews'

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

    const [thisWeek] = await db
        .select({
            avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
            reviewCount: count(),
        })
        .from(reviews)
        .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart)))

    const [lastWeek] = await db
        .select({
            avgRating: sql<number>`coalesce(avg(${reviews.ratingNumeric}), 0)`,
            reviewCount: count(),
        })
        .from(reviews)
        .where(and(gte(reviews.reviewDate, lastWeekStart), lt(reviews.reviewDate, thisWeekStart)))

    return {
        thisWeek: {
            avgRating: Number(thisWeek?.avgRating ?? 0),
            reviewCount: Number(thisWeek?.reviewCount ?? 0),
        },
        lastWeek: {
            avgRating: Number(lastWeek?.avgRating ?? 0),
            reviewCount: Number(lastWeek?.reviewCount ?? 0),
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

    const allProperties = await loadAllProperties()

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

    const negativeReviews = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
            and(
                gte(reviews.reviewDate, thisWeekStart),
                lt(reviews.reviewDate, nextWeekStart),
                lte(reviews.ratingNumeric, '5'),
            ),
        )

    const negativeCount = negativeReviews.length
    if (negativeCount === 0) {
        return []
    }

    const negativeIds = negativeReviews.map((r) => r.id)

    const topicCounts = await db
        .select({
            topic: reviewTopics.topic,
            count: count(),
        })
        .from(reviewTopics)
        .where(and(inArray(reviewTopics.reviewId, negativeIds), eq(reviewTopics.sentiment, 'negative')))
        .groupBy(reviewTopics.topic)
        .orderBy(desc(count()))

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
    ) then 0 else 1 end`
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
        ? [asc(representativeRank), asc(reviews.ratingNumeric), desc(reviews.reviewDate), desc(reviews.id)]
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
    const allProperties = await loadAllProperties()

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
