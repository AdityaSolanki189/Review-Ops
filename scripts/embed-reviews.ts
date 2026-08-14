import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, pool } from '@/db'
import { reviewEmbeddings, reviews } from '@/db/schema'
import { buildReviewEmbeddingInput, embedTexts, hashEmbeddingInput } from '@/lib/ai/embeddings'
import { isEmbeddingConfigured } from '@/lib/ai/openrouter'
import { env } from '@/lib/config/env'

const BATCH_SIZE = 64

function parseOptions(args: string[]) {
    const limitIndex = args.indexOf('--limit')
    const rawLimit = limitIndex >= 0 ? args[limitIndex + 1] : '10000'
    const limit = Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
        throw new Error('--limit must be an integer between 1 and 10000')
    }
    return { limit, dryRun: args.includes('--dry-run') }
}

async function main() {
    if (!isEmbeddingConfigured()) {
        throw new Error('OPENROUTER_API_KEY is required for embedding backfill.')
    }

    const { limit, dryRun } = parseOptions(process.argv.slice(2))
    const candidates = await db
        .select({
            id: reviews.id,
            title: reviews.title,
            positiveText: reviews.positiveText,
            negativeText: reviews.negativeText,
            inputHash: reviewEmbeddings.inputHash,
        })
        .from(reviews)
        .leftJoin(reviewEmbeddings, eq(reviewEmbeddings.reviewId, reviews.id))
        .limit(limit)

    const pending = candidates.filter((row) => {
        const input = buildReviewEmbeddingInput(row)
        if (!input) return false
        return hashEmbeddingInput(input) !== row.inputHash
    })

    const estimatedTokens = pending.reduce((sum, row) => sum + buildReviewEmbeddingInput(row).length / 4, 0)
    console.log(`${pending.length} reviews need embeddings (~${Math.round(estimatedTokens)} tokens).`)

    if (dryRun) return

    let processed = 0
    for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
        const batch = pending.slice(offset, offset + BATCH_SIZE)
        const inputs = batch.map((row) => buildReviewEmbeddingInput(row))
        const embeddings = await embedTexts(inputs)

        for (let index = 0; index < batch.length; index++) {
            const row = batch[index]
            const input = inputs[index]
            const embedding = embeddings[index]
            if (!row || !input || !embedding) continue

            await db
                .insert(reviewEmbeddings)
                .values({
                    reviewId: row.id,
                    embedding,
                    model: env.OPENROUTER_EMBEDDING_MODEL,
                    inputHash: hashEmbeddingInput(input),
                })
                .onConflictDoUpdate({
                    target: reviewEmbeddings.reviewId,
                    set: {
                        embedding,
                        model: env.OPENROUTER_EMBEDDING_MODEL,
                        inputHash: hashEmbeddingInput(input),
                    },
                })
            processed += 1
        }

        console.log(`Embedded ${processed}/${pending.length} reviews...`)
    }

    console.log(`Embedded ${processed} reviews.`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
