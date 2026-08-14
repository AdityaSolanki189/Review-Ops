import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { properties, reviews, reviewTopics, type Property } from '@/db/schema'
import { invalidateCache } from '@/lib/cache/cached'
import { classifyReview, CLASSIFIER_VERSION } from '@/lib/classification/topics'
import { PROPERTY_SEEDS } from '@/lib/properties'
import type { SampleReviewsExport } from '@/lib/sample-reviews'

export async function seedProperties(): Promise<Property[]> {
    const seeded: Property[] = []

    for (const seed of PROPERTY_SEEDS) {
        const [existing] = await db.select().from(properties).where(eq(properties.slug, seed.slug)).limit(1)

        if (existing) {
            const [updated] = await db
                .update(properties)
                .set({
                    name: seed.name,
                    bookingUrl: seed.bookingUrl,
                    bookingPropertyId: seed.bookingPropertyId,
                })
                .where(eq(properties.id, existing.id))
                .returning()

            if (updated) {
                seeded.push(updated)
            }
            continue
        }

        const [created] = await db
            .insert(properties)
            .values({
                slug: seed.slug,
                name: seed.name,
                bookingUrl: seed.bookingUrl,
                bookingPropertyId: seed.bookingPropertyId,
            })
            .returning()

        if (created) {
            seeded.push(created)
        }
    }

    await invalidateCache()

    return seeded
}

const SAMPLE_REVIEWS_PATH = path.join(process.cwd(), 'data', 'sample-reviews.json')

export interface SeedSampleReviewsResult {
    inserted: number
    skipped: number
    topicsInserted: number
}

export async function seedSampleReviews(): Promise<SeedSampleReviewsResult> {
    let payload: SampleReviewsExport
    try {
        const raw = await readFile(SAMPLE_REVIEWS_PATH, 'utf8')
        payload = JSON.parse(raw) as SampleReviewsExport
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { inserted: 0, skipped: 0, topicsInserted: 0 }
        }
        throw error
    }

    const propertyRows = await db.select().from(properties)
    const propertyBySlug = new Map(propertyRows.map((property) => [property.slug, property]))

    let inserted = 0
    let skipped = 0
    let topicsInserted = 0

    for (const sample of payload.reviews) {
        const property = propertyBySlug.get(sample.propertySlug)
        if (!property) continue

        const [existingByFingerprint] = await db
            .select({ id: reviews.id })
            .from(reviews)
            .where(eq(reviews.fingerprint, sample.fingerprint))
            .limit(1)

        if (existingByFingerprint) {
            skipped += 1
            continue
        }

        if (sample.externalId) {
            const [existingByExternalId] = await db
                .select({ id: reviews.id })
                .from(reviews)
                .where(eq(reviews.externalId, sample.externalId))
                .limit(1)
            if (existingByExternalId) {
                skipped += 1
                continue
            }
        }

        const [created] = await db
            .insert(reviews)
            .values({
                propertyId: property.id,
                source: sample.source,
                externalId: sample.externalId,
                fingerprint: sample.fingerprint,
                rating: sample.rating,
                title: sample.title,
                positiveText: sample.positiveText,
                negativeText: sample.negativeText,
                reviewDate: new Date(sample.reviewDate),
                stayDate: sample.stayDate ? new Date(sample.stayDate) : null,
                reviewerName: sample.reviewerName,
                reviewerCountry: sample.reviewerCountry,
                roomType: sample.roomType,
                travellerType: sample.travellerType,
                scrapedAt: new Date(sample.scrapedAt),
                classifierVersion: sample.classifierVersion ?? CLASSIFIER_VERSION,
                classifiedAt: sample.classifiedAt ? new Date(sample.classifiedAt) : new Date(),
            })
            .returning()

        if (!created) continue
        inserted += 1

        const topics =
            sample.topics.length > 0
                ? sample.topics
                : classifyReview({
                      rating: Number(sample.rating),
                      title: sample.title ?? undefined,
                      positiveText: sample.positiveText ?? undefined,
                      negativeText: sample.negativeText ?? undefined,
                  }).map((topic) => ({
                      topic: topic.topic,
                      sentiment: topic.sentiment,
                      confidence: String(topic.confidence),
                  }))

        if (topics.length > 0) {
            await db.insert(reviewTopics).values(
                topics.map((topic) => ({
                    reviewId: created.id,
                    topic: topic.topic as (typeof reviewTopics.$inferInsert)['topic'],
                    sentiment: topic.sentiment as (typeof reviewTopics.$inferInsert)['sentiment'],
                    confidence: topic.confidence,
                })),
            )
            topicsInserted += topics.length
        }
    }

    if (inserted > 0) {
        await invalidateCache()
    }

    return { inserted, skipped, topicsInserted }
}
