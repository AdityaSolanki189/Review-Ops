import { NextResponse } from 'next/server'
import { and, eq, gte, ilike, lt, or, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions/vector'
import { db } from '@/db'
import { properties, reviewEmbeddings, reviews, reviewTopics } from '@/db/schema'
import { attachTopics } from '@/db/queries/analytics'
import { cachedQuery } from '@/lib/cache/cached'
import { buildReviewEmbeddingInput, embedText, hashEmbeddingInput } from '@/lib/ai/embeddings'
import { isEmbeddingConfigured } from '@/lib/ai/openrouter'
import { env } from '@/lib/config/env'
import { parseReviewSearchParams, type ParsedReviewSearchFilters } from '@/lib/reviews'

const SEARCH_CACHE_TTL = 86_400
const MIN_SIMILARITY = 0.25

function buildScopeConditions(filters: ParsedReviewSearchFilters) {
    return and(
        filters.from ? gte(reviews.reviewDate, filters.from) : undefined,
        filters.to ? lt(reviews.reviewDate, filters.to) : undefined,
        filters.propertySlug ? eq(properties.slug, filters.propertySlug) : undefined,
        filters.minRating !== undefined ? gte(reviews.ratingNumeric, String(filters.minRating)) : undefined,
        filters.maxRating !== undefined ? sql`${reviews.ratingNumeric} <= ${String(filters.maxRating)}` : undefined,
        filters.topic
            ? sql`exists (
                select 1 from ${reviewTopics}
                where ${reviewTopics.reviewId} = ${reviews.id}
                  and ${reviewTopics.topic} = ${filters.topic}
                  ${filters.sentiment ? sql`and ${reviewTopics.sentiment} = ${filters.sentiment}` : sql``}
            )`
            : undefined,
        !filters.topic && filters.sentiment
            ? sql`exists (
                select 1 from ${reviewTopics}
                where ${reviewTopics.reviewId} = ${reviews.id}
                  and ${reviewTopics.sentiment} = ${filters.sentiment}
            )`
            : undefined,
    )
}

async function getQueryEmbedding(query: string): Promise<number[]> {
    const cacheKey = `embedding-query:${env.OPENROUTER_EMBEDDING_MODEL}:${hashEmbeddingInput(query)}`
    return cachedQuery(cacheKey, SEARCH_CACHE_TTL, () => embedText(query))
}

async function searchByEmbedding(filters: ParsedReviewSearchFilters) {
    const queryEmbedding = await getQueryEmbedding(filters.q)
    const distance = cosineDistance(reviewEmbeddings.embedding, queryEmbedding)
    const similarity = sql<number>`1 - (${distance})`

    const rows = await db
        .select({
            review: reviews,
            property: properties,
            similarity,
        })
        .from(reviewEmbeddings)
        .innerJoin(reviews, eq(reviews.id, reviewEmbeddings.reviewId))
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(and(buildScopeConditions(filters), sql`${similarity} >= ${MIN_SIMILARITY}`))
        .orderBy(sql`${similarity} desc`)
        .limit(filters.limit)

    const enriched = await attachTopics(rows.map((row) => ({ review: row.review, property: row.property })))

    return {
        mode: 'semantic' as const,
        items: enriched.map((review, index) => ({
            ...review,
            similarity: Number(rows[index]?.similarity ?? 0),
        })),
    }
}

async function searchByKeyword(filters: ParsedReviewSearchFilters) {
    const terms = filters.q
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean)
    const textMatch =
        terms.length > 0
            ? or(
                  ...terms.flatMap((term) => [
                      ilike(reviews.title, `%${term}%`),
                      ilike(reviews.positiveText, `%${term}%`),
                      ilike(reviews.negativeText, `%${term}%`),
                  ]),
              )
            : undefined

    const rows = await db
        .select({
            review: reviews,
            property: properties,
        })
        .from(reviews)
        .innerJoin(properties, eq(properties.id, reviews.propertyId))
        .where(and(buildScopeConditions(filters), textMatch))
        .orderBy(sql`${reviews.reviewDate} desc`)
        .limit(filters.limit)

    const enriched = await attachTopics(rows.map((row) => ({ review: row.review, property: row.property })))

    return {
        mode: 'keyword' as const,
        items: enriched.map((review) => ({ ...review, similarity: null })),
    }
}

export async function GET(request: Request) {
    const parsed = parseReviewSearchParams(new URL(request.url).searchParams)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    try {
        if (isEmbeddingConfigured()) {
            try {
                return NextResponse.json(await searchByEmbedding(parsed.data))
            } catch (error) {
                console.warn('[reviews/search] semantic search failed, falling back to keyword search:', error)
            }
        }

        return NextResponse.json(await searchByKeyword(parsed.data))
    } catch (error) {
        console.error('[reviews/search] failed:', error)
        const message = error instanceof Error ? error.message : 'Search failed.'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
