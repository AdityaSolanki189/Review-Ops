import { and, asc, count, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/db'
import { properties, reviews, reviewTopics, scrapeRuns } from '@/db/schema'
import { cachedQuery } from '@/lib/cache/cached'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'

const CACHE_TTL = {
    properties: 3600,
    property: 3600,
    weekly: 300,
    performance: 300,
    topicsNeg: 300,
    reviews: 120,
    topicMix: 300,
    sync: 60,
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
        topic: filters.topic ?? '',
        sentiment: filters.sentiment ?? '',
        from: filters.from?.toISOString() ?? '',
        to: filters.to?.toISOString() ?? '',
        limit: filters.limit ?? 20,
    })
}

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
            avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)`,
            reviewCount: count(),
        })
        .from(reviews)
        .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart)))

    const [lastWeek] = await db
        .select({
            avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)`,
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
                avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)`,
                reviewCount: count(),
            })
            .from(reviews)
            .where(and(gte(reviews.reviewDate, thisWeekStart), lt(reviews.reviewDate, nextWeekStart)))
            .groupBy(reviews.propertyId),
        db
            .select({
                propertyId: reviews.propertyId,
                avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)`,
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
                sql`${reviews.rating}::numeric <= 5`,
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
    from?: Date
    to?: Date
    limit?: number
}

async function loadRecentReviews(filters: ReviewFilters) {
    const limit = filters.limit ?? 20
    const conditions = []

    if (filters.propertySlug) {
        const property = await loadPropertyBySlug(filters.propertySlug)
        if (property) {
            conditions.push(eq(reviews.propertyId, property.id))
        }
    }

    if (filters.minRating !== undefined) {
        conditions.push(sql`${reviews.rating}::numeric >= ${filters.minRating}`)
    }

    if (filters.maxRating !== undefined) {
        conditions.push(sql`${reviews.rating}::numeric <= ${filters.maxRating}`)
    }

    if (filters.from) {
        conditions.push(gte(reviews.reviewDate, filters.from))
    }

    if (filters.to) {
        conditions.push(lte(reviews.reviewDate, filters.to))
    }

    const rows = await db
        .select({
            review: reviews,
            property: properties,
        })
        .from(reviews)
        .innerJoin(properties, eq(reviews.propertyId, properties.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(reviews.reviewDate))
        .limit(limit)

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

    const enriched = []

    for (const row of rows) {
        const topics = topicsByReviewId.get(row.review.id) ?? []

        if (filters.topic && !topics.some((t) => t.topic === filters.topic)) {
            continue
        }

        if (filters.sentiment && !topics.some((t) => t.sentiment === filters.sentiment)) {
            continue
        }

        enriched.push({
            ...row.review,
            property: row.property,
            topics,
        })
    }

    return enriched
}

export async function getRecentReviews(filters: ReviewFilters = {}) {
    return cachedQuery(`reviews:${hashReviewFilters(filters)}`, CACHE_TTL.reviews, () => loadRecentReviews(filters))
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
