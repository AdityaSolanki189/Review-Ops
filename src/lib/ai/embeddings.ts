import { createHash } from 'node:crypto'
import { embed, embedMany } from 'ai'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { reviewEmbeddings, reviews } from '@/db/schema'
import { getOpenRouterEmbeddingModel, isEmbeddingConfigured } from '@/lib/ai/openrouter'
import { env } from '@/lib/config/env'

export function buildReviewEmbeddingInput(review: {
    title?: string | null
    positiveText?: string | null
    negativeText?: string | null
}): string {
    return [review.title, review.positiveText, review.negativeText].filter(Boolean).join('\n').trim()
}

export function hashEmbeddingInput(input: string): string {
    return createHash('sha256').update(input).digest('hex')
}

const EMBED_TIMEOUT_MS = 8_000

export async function embedText(value: string): Promise<number[]> {
    const result = await Promise.race([
        embed({
            model: getOpenRouterEmbeddingModel(),
            value,
        }),
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Embedding request timed out')), EMBED_TIMEOUT_MS)
        }),
    ])
    return result.embedding
}

export async function embedTexts(values: string[]): Promise<number[][]> {
    if (values.length === 0) return []
    const result = await embedMany({
        model: getOpenRouterEmbeddingModel(),
        values,
    })
    return result.embeddings
}

export async function upsertReviewEmbedding(reviewId: string, input: string): Promise<void> {
    const inputHash = hashEmbeddingInput(input)
    const [existing] = await db
        .select({ inputHash: reviewEmbeddings.inputHash })
        .from(reviewEmbeddings)
        .where(eq(reviewEmbeddings.reviewId, reviewId))
        .limit(1)

    if (existing?.inputHash === inputHash) return

    const embedding = await embedText(input)
    await db
        .insert(reviewEmbeddings)
        .values({
            reviewId,
            embedding,
            model: env.OPENROUTER_EMBEDDING_MODEL,
            inputHash,
        })
        .onConflictDoUpdate({
            target: reviewEmbeddings.reviewId,
            set: {
                embedding,
                model: env.OPENROUTER_EMBEDDING_MODEL,
                inputHash,
            },
        })
}

export async function embedReviewsByIds(reviewIds: string[]): Promise<number> {
    if (!isEmbeddingConfigured() || reviewIds.length === 0) return 0

    const rows = await db
        .select({
            id: reviews.id,
            title: reviews.title,
            positiveText: reviews.positiveText,
            negativeText: reviews.negativeText,
        })
        .from(reviews)
        .where(inArray(reviews.id, reviewIds))

    let embedded = 0
    for (const row of rows) {
        const input = buildReviewEmbeddingInput(row)
        if (!input) continue
        await upsertReviewEmbedding(row.id, input)
        embedded += 1
    }
    return embedded
}

export async function countEmbeddedReviews(): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(reviewEmbeddings)
    return Number(row?.count ?? 0)
}
