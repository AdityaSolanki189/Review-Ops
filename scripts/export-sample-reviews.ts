import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'
import { desc, eq, inArray } from 'drizzle-orm'
import { pool } from '@/db'
import { db } from '@/db'
import { properties, reviews, reviewTopics } from '@/db/schema'
import type { SampleReviewRecord, SampleReviewTopic, SampleReviewsExport } from '@/lib/sample-reviews'

const MAX_REVIEWS_PER_PROPERTY = 400
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'sample-reviews.json')

function anonymizeReviewerName(index: number): string {
    return `Guest ${1000 + index}`
}

async function main() {
    const allProperties = await db.select().from(properties).orderBy(properties.slug)
    if (allProperties.length === 0) {
        throw new Error('No properties found. Run pnpm db:seed first.')
    }

    const exportedReviews: SampleReviewRecord[] = []
    const propertySummaries: SampleReviewsExport['properties'] = []
    let guestCounter = 0

    for (const property of allProperties) {
        const propertyReviews = await db
            .select()
            .from(reviews)
            .where(eq(reviews.propertyId, property.id))
            .orderBy(desc(reviews.reviewDate))
            .limit(MAX_REVIEWS_PER_PROPERTY)

        if (propertyReviews.length === 0) {
            propertySummaries.push({ slug: property.slug, name: property.name, reviewCount: 0 })
            continue
        }

        const reviewIds = propertyReviews.map((review) => review.id)
        const topics =
            reviewIds.length > 0
                ? await db.select().from(reviewTopics).where(inArray(reviewTopics.reviewId, reviewIds))
                : []
        const topicsByReview = new Map<string, SampleReviewTopic[]>()
        for (const topic of topics) {
            const existing = topicsByReview.get(topic.reviewId) ?? []
            existing.push({
                topic: topic.topic,
                sentiment: topic.sentiment,
                confidence: topic.confidence,
            })
            topicsByReview.set(topic.reviewId, existing)
        }

        for (const review of propertyReviews) {
            guestCounter += 1
            exportedReviews.push({
                propertySlug: property.slug,
                source: 'booking',
                externalId: review.externalId,
                fingerprint: review.fingerprint,
                rating: review.rating,
                title: review.title,
                positiveText: review.positiveText,
                negativeText: review.negativeText,
                reviewDate: review.reviewDate.toISOString(),
                stayDate: review.stayDate?.toISOString() ?? null,
                reviewerName: review.reviewerName ? anonymizeReviewerName(guestCounter) : null,
                reviewerCountry: review.reviewerCountry,
                roomType: review.roomType,
                travellerType: review.travellerType,
                scrapedAt: review.scrapedAt.toISOString(),
                classifierVersion: review.classifierVersion,
                classifiedAt: review.classifiedAt?.toISOString() ?? null,
                topics: topicsByReview.get(review.id) ?? [],
            })
        }

        propertySummaries.push({
            slug: property.slug,
            name: property.name,
            reviewCount: propertyReviews.length,
        })
    }

    if (exportedReviews.length === 0) {
        throw new Error('No reviews found in database. Run pnpm scrape before exporting sample data.')
    }

    const payload: SampleReviewsExport = {
        exportedAt: new Date().toISOString(),
        maxReviewsPerProperty: MAX_REVIEWS_PER_PROPERTY,
        anonymizedReviewerNames: true,
        properties: propertySummaries,
        reviews: exportedReviews,
    }

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

    const total = exportedReviews.length
    console.log(`Exported ${total} reviews to ${OUTPUT_PATH}`)
    for (const summary of propertySummaries) {
        console.log(`  ${summary.slug}: ${summary.reviewCount}`)
    }

    await pool.end()
    process.exit(0)
}

main().catch(async (error) => {
    console.error('Export failed:', error)
    await pool.end()
    process.exit(1)
})
