import { eq, or } from 'drizzle-orm'
import { db } from '@/db'
import { reviews, reviewTopics, scrapeRuns, type Property } from '@/db/schema'
import { invalidateCache } from '@/lib/cache/cached'
import { classifyReview } from '@/lib/classification/topics'
import { buildExternalId, buildReviewFingerprint } from '@/lib/deduplicate'
import type { ScrapedReview } from '@/lib/validations/review'

export async function reviewExists(property: Property, scraped: ScrapedReview): Promise<boolean> {
    const fingerprint = buildReviewFingerprint({
        propertyId: property.id,
        reviewerName: scraped.reviewerName,
        reviewDate: scraped.reviewDate,
        rating: String(scraped.rating),
        positiveText: scraped.positiveText,
        negativeText: scraped.negativeText,
    })

    const externalId = scraped.externalId ? buildExternalId(property.bookingPropertyId, scraped.externalId) : undefined

    const conditions = [eq(reviews.fingerprint, fingerprint)]
    if (externalId) {
        conditions.push(eq(reviews.externalId, externalId))
    }

    const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(or(...conditions))
        .limit(1)

    return Boolean(existing)
}

export async function insertReview(property: Property, scraped: ScrapedReview): Promise<boolean> {
    const fingerprint = buildReviewFingerprint({
        propertyId: property.id,
        reviewerName: scraped.reviewerName,
        reviewDate: scraped.reviewDate,
        rating: String(scraped.rating),
        positiveText: scraped.positiveText,
        negativeText: scraped.negativeText,
    })

    const externalId = scraped.externalId ? buildExternalId(property.bookingPropertyId, scraped.externalId) : null

    try {
        const [inserted] = await db
            .insert(reviews)
            .values({
                propertyId: property.id,
                source: 'booking',
                externalId,
                fingerprint,
                rating: String(scraped.rating),
                title: scraped.title ?? null,
                positiveText: scraped.positiveText ?? null,
                negativeText: scraped.negativeText ?? null,
                reviewDate: scraped.reviewDate,
                stayDate: scraped.stayDate ?? null,
                reviewerName: scraped.reviewerName ?? null,
                reviewerCountry: scraped.reviewerCountry ?? null,
                roomType: scraped.roomType ?? null,
                travellerType: scraped.travellerType ?? null,
                scrapedAt: new Date(),
            })
            .returning()

        if (!inserted) {
            return false
        }

        const topics = classifyReview({
            rating: scraped.rating,
            title: scraped.title,
            positiveText: scraped.positiveText,
            negativeText: scraped.negativeText,
        })

        if (topics.length > 0) {
            await db.insert(reviewTopics).values(
                topics.map((topic) => ({
                    reviewId: inserted.id,
                    topic: topic.topic,
                    sentiment: topic.sentiment,
                    confidence: String(topic.confidence),
                })),
            )
        }

        return true
    } catch {
        return false
    }
}

export async function createScrapeRun(propertyId: string) {
    const [run] = await db
        .insert(scrapeRuns)
        .values({
            propertyId,
            status: 'running',
            startedAt: new Date(),
        })
        .returning()

    return run
}

export async function finishScrapeRun(
    runId: string,
    data: {
        status: 'success' | 'partial' | 'failed' | 'blocked'
        reviewsFound: number
        reviewsInserted: number
        reviewsUpdated: number
        attemptCount: number
        errorMessage?: string
    },
) {
    await db
        .update(scrapeRuns)
        .set({
            status: data.status,
            finishedAt: new Date(),
            reviewsFound: String(data.reviewsFound),
            reviewsInserted: String(data.reviewsInserted),
            reviewsUpdated: String(data.reviewsUpdated),
            attemptCount: String(data.attemptCount),
            errorMessage: data.errorMessage ?? null,
        })
        .where(eq(scrapeRuns.id, runId))

    await invalidateCache()
}
