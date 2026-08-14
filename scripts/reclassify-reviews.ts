import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db, pool } from '@/db'
import { reviews, reviewTopics } from '@/db/schema'
import { classifyReview } from '@/lib/classification/topics'

function parseOptions(args: string[]) {
    const limitIndex = args.indexOf('--limit')
    const rawLimit = limitIndex >= 0 ? args[limitIndex + 1] : '100'
    const limit = Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
        throw new Error('--limit must be an integer between 1 and 10000')
    }
    return { limit, dryRun: args.includes('--dry-run') }
}

async function main() {
    const { limit, dryRun } = parseOptions(process.argv.slice(2))
    const candidates = await db
        .select()
        .from(reviews)
        .where(sql`not exists (select 1 from ${reviewTopics} where ${reviewTopics.reviewId} = ${reviews.id})`)
        .limit(limit)

    if (dryRun) {
        console.log(`${candidates.length} reviews are eligible for reclassification (dry run).`)
        return
    }

    for (const review of candidates) {
        const topics = classifyReview({
            rating: Number(review.rating),
            title: review.title,
            positiveText: review.positiveText,
            negativeText: review.negativeText,
        })
        if (topics.length > 0) {
            await db
                .insert(reviewTopics)
                .values(
                    topics.map((topic) => ({ ...topic, reviewId: review.id, confidence: String(topic.confidence) })),
                )
        }
    }

    console.log(`Reclassified ${candidates.length} reviews with no existing topic rows.`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
