import { desc, eq, max } from 'drizzle-orm'
import { db } from '@/db'
import { properties, reviews, type Property } from '@/db/schema'

export async function getPropertyWatermark(property: Property): Promise<Date | null> {
    if (property.latestReviewAt) {
        return property.latestReviewAt
    }

    const [row] = await db
        .select({ latest: max(reviews.reviewDate) })
        .from(reviews)
        .where(eq(reviews.propertyId, property.id))

    return row?.latest ?? null
}

export async function updatePropertyWatermark(propertyId: string, newestReviewAt: Date | null): Promise<void> {
    if (!newestReviewAt) return

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1)
    if (!property) return

    const current = property.latestReviewAt
    if (current && current.getTime() >= newestReviewAt.getTime()) {
        return
    }

    await db.update(properties).set({ latestReviewAt: newestReviewAt }).where(eq(properties.id, propertyId))
}

export async function getLatestReviewDateForProperty(propertyId: string): Promise<Date | null> {
    const [row] = await db
        .select({ reviewDate: reviews.reviewDate })
        .from(reviews)
        .where(eq(reviews.propertyId, propertyId))
        .orderBy(desc(reviews.reviewDate))
        .limit(1)

    return row?.reviewDate ?? null
}
