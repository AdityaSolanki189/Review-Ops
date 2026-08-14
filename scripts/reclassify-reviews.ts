import 'dotenv/config'
import { eq, or, isNull, lt, sql } from 'drizzle-orm'
import { db, pool } from '@/db'
import { reviews, reviewTopics } from '@/db/schema'
import { CLASSIFIER_VERSION, classifyReview } from '@/lib/classification/topics'
import { invalidateCache } from '@/lib/cache/cached'

const BATCH_SIZE = 100

function parseOptions(args: string[]) {
    const limitIndex = args.indexOf('--limit')
    const rawLimit = limitIndex >= 0 ? args[limitIndex + 1] : '10000'
    const limit = Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
        throw new Error('--limit must be an integer between 1 and 10000')
    }
    return { limit, dryRun: args.includes('--dry-run') }
}

async function reclassifyReview(review: typeof reviews.$inferSelect) {
    const topics = classifyReview({
        rating: Number(review.rating),
        title: review.title,
        positiveText: review.positiveText,
        negativeText: review.negativeText,
    })

    await db.transaction(async (transaction) => {
        await transaction.delete(reviewTopics).where(eq(reviewTopics.reviewId, review.id))
        if (topics.length > 0) {
            await transaction.insert(reviewTopics).values(
                topics.map((topic) => ({
                    ...topic,
                    reviewId: review.id,
                    confidence: String(topic.confidence),
                })),
            )
        }
        await transaction
            .update(reviews)
            .set({
                classifierVersion: CLASSIFIER_VERSION,
                classifiedAt: new Date(),
            })
            .where(eq(reviews.id, review.id))
    })
}

async function main() {
    const { limit, dryRun } = parseOptions(process.argv.slice(2))

    const candidates = await db
        .select()
        .from(reviews)
        .where(or(isNull(reviews.classifierVersion), lt(reviews.classifierVersion, CLASSIFIER_VERSION)))
        .orderBy(sql`${reviews.reviewDate} desc`)
        .limit(limit)

    if (dryRun) {
        console.log(
            `${candidates.length} reviews are eligible for reclassification to v${CLASSIFIER_VERSION} (dry run).`,
        )
        return
    }

    let processed = 0
    for (let offset = 0; offset < candidates.length; offset += BATCH_SIZE) {
        const batch = candidates.slice(offset, offset + BATCH_SIZE)
        for (const review of batch) {
            await reclassifyReview(review)
            processed += 1
        }
        console.log(`Reclassified ${processed}/${candidates.length} reviews...`)
    }

    await invalidateCache()
    console.log(`Reclassified ${processed} reviews to classifier v${CLASSIFIER_VERSION}.`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
