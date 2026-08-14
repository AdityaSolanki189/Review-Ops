import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { properties, type Property } from '@/db/schema'
import { invalidateCache } from '@/lib/cache/cached'
import { PROPERTY_SEEDS } from '@/lib/properties'

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
