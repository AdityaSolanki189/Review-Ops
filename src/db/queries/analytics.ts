import { and, asc, count, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { properties, reviews, reviewTopics, scrapeRuns } from '@/db/schema'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'

function startOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
}

export async function getAllProperties() {
    return db.select().from(properties).orderBy(asc(properties.name))
}

export async function getPropertyBySlug(slug: string) {
    const [property] = await db.select().from(properties).where(eq(properties.slug, slug)).limit(1)
    return property ?? null
}

export async function getWeeklyStats(referenceDate = new Date()) {
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

export async function getPropertyPerformance(referenceDate = new Date()) {
    const thisWeekStart = startOfWeek(referenceDate)
    const nextWeekStart = new Date(thisWeekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const allProperties = await getAllProperties()
    const results = []

    for (const property of allProperties) {
        const [thisWeek] = await db
            .select({ avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)`, reviewCount: count() })
            .from(reviews)
            .where(
                and(
                    eq(reviews.propertyId, property.id),
                    gte(reviews.reviewDate, thisWeekStart),
                    lt(reviews.reviewDate, nextWeekStart),
                ),
            )

        const [lastWeek] = await db
            .select({ avgRating: sql<number>`coalesce(avg(${reviews.rating}::numeric), 0)` })
            .from(reviews)
            .where(
                and(
                    eq(reviews.propertyId, property.id),
                    gte(reviews.reviewDate, lastWeekStart),
                    lt(reviews.reviewDate, thisWeekStart),
                ),
            )

        const [totalReviews] = await db
            .select({ count: count() })
            .from(reviews)
            .where(eq(reviews.propertyId, property.id))

        results.push({
            property,
            avgRating: Number(thisWeek?.avgRating ?? 0),
            reviewCount: Number(thisWeek?.reviewCount ?? 0),
            delta: Number(thisWeek?.avgRating ?? 0) - Number(lastWeek?.avgRating ?? 0),
            totalReviews: Number(totalReviews?.count ?? 0),
        })
    }

    return results
}

export async function getNegativeTopicTrends(referenceDate = new Date()) {
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

export async function getRecentReviews(filters: ReviewFilters = {}) {
    const limit = filters.limit ?? 20
    const conditions = []

    if (filters.propertySlug) {
        const property = await getPropertyBySlug(filters.propertySlug)
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

    const enriched = []

    for (const row of rows) {
        const topics = await db.select().from(reviewTopics).where(eq(reviewTopics.reviewId, row.review.id))

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

export async function getLatestScrapeRuns() {
    const allProperties = await getAllProperties()
    const results = []

    for (const property of allProperties) {
        const [latest] = await db
            .select()
            .from(scrapeRuns)
            .where(eq(scrapeRuns.propertyId, property.id))
            .orderBy(desc(scrapeRuns.startedAt))
            .limit(1)

        results.push({ property, run: latest ?? null })
    }

    return results
}

export async function getScrapeRunHistory(limit = 50) {
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

export async function getPropertyTopicMix(propertyId: string) {
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
