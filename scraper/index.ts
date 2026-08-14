import 'dotenv/config'
import { chromium } from 'playwright'
import { eq } from 'drizzle-orm'
import { db, pool } from '@/db'
import { properties } from '@/db/schema'
import { seedProperties } from '@/lib/seed'
import { scrapePropertyReviews } from './booking'
import { createScrapeRun, finishScrapeRun, insertReview } from './deduplicate'
import { embedReviewsByIds } from '@/lib/ai/embeddings'
import { isEmbeddingConfigured } from '@/lib/ai/openrouter'
import { maxReviewDate } from './graphql'
import { SCRAPE_CONFIG } from './selectors'
import { sleep, withRetry } from './retry'
import {
    countReviewsForProperty,
    getPropertyWatermark,
    resetBackfillSkip,
    updateBackfillSkip,
    updatePropertyWatermark,
} from './watermark'

class GraphqlCaptureError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GraphqlCaptureError'
    }
}

async function scrapeSingleProperty(propertyId: string) {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1)
    if (!property) {
        throw new Error(`Property not found: ${propertyId}`)
    }

    const watermark = await getPropertyWatermark(property)
    const initialDbCount = await countReviewsForProperty(property.id)
    const storedBackfillSkip = Number.parseInt(property.backfillSkip ?? '0', 10) || 0

    let attemptCount = 0
    let runId: string | undefined

    try {
        const result = await withRetry(
            async () => {
                attemptCount += 1
                const run = await createScrapeRun(property.id)
                runId = run?.id

                const headed = process.env.SCRAPE_HEADED === '1'
                const browser = await chromium.launch({ headless: !headed })

                try {
                    let reviewsFound = 0
                    let reviewsInserted = 0
                    let reviewsUpdated = 0
                    let newestReviewDate: Date | null = null
                    let dbCount = initialDbCount
                    const embeddedReviewIds: string[] = []

                    const scrapeResult = await scrapePropertyReviews(
                        browser,
                        property,
                        {
                            dbCount: initialDbCount,
                            storedBackfillSkip,
                            watermark,
                        },
                        async (event) => {
                            reviewsFound += event.reviews.length
                            let consecutiveKnown = 0
                            let pageInserted = 0
                            let pageUpdated = 0
                            const backfillMode = event.dbCountBeforePage < event.reviewsCount

                            for (const scraped of event.reviews) {
                                const persisted = await insertReview(property, scraped)
                                if (persisted.kind === 'duplicate') {
                                    if (!backfillMode) {
                                        consecutiveKnown += 1
                                        if (consecutiveKnown >= SCRAPE_CONFIG.consecutiveKnownStop) {
                                            return {
                                                stop: true,
                                                consecutiveKnown,
                                                pageInserted,
                                                pageUpdated,
                                                dbCountAfterPage: dbCount,
                                            }
                                        }
                                    }
                                    continue
                                }

                                consecutiveKnown = 0
                                if (persisted.kind === 'inserted') {
                                    reviewsInserted += 1
                                    pageInserted += 1
                                    dbCount += 1
                                    embeddedReviewIds.push(persisted.reviewId)
                                } else {
                                    reviewsUpdated += 1
                                    pageUpdated += 1
                                    embeddedReviewIds.push(persisted.reviewId)
                                }
                            }

                            await updateBackfillSkip(property.id, event.skip + event.pageSize)

                            const pageNewest = maxReviewDate(event.reviews.map((review) => review.reviewDate))
                            if (
                                pageNewest &&
                                (!newestReviewDate || pageNewest.getTime() > newestReviewDate.getTime())
                            ) {
                                newestReviewDate = pageNewest
                            }

                            if (
                                !backfillMode &&
                                watermark &&
                                event.reviews.some((review) => review.reviewDate.getTime() <= watermark.getTime())
                            ) {
                                return {
                                    stop: true,
                                    consecutiveKnown,
                                    pageInserted,
                                    pageUpdated,
                                    dbCountAfterPage: dbCount,
                                }
                            }

                            if (!backfillMode && consecutiveKnown >= SCRAPE_CONFIG.consecutiveKnownStop) {
                                return {
                                    stop: true,
                                    consecutiveKnown,
                                    pageInserted,
                                    pageUpdated,
                                    dbCountAfterPage: dbCount,
                                }
                            }

                            return {
                                stop: false,
                                consecutiveKnown,
                                pageInserted,
                                pageUpdated,
                                dbCountAfterPage: dbCount,
                            }
                        },
                    )

                    reviewsFound = scrapeResult.reviewsFound
                    reviewsInserted = scrapeResult.reviewsInserted
                    reviewsUpdated = scrapeResult.reviewsUpdated
                    if (scrapeResult.newestReviewDate) {
                        newestReviewDate = scrapeResult.newestReviewDate
                    }

                    if (scrapeResult.blocked) {
                        if (runId) {
                            await finishScrapeRun(runId, {
                                status: 'blocked',
                                reviewsFound,
                                reviewsInserted,
                                reviewsUpdated,
                                attemptCount,
                                errorMessage: 'Booking.com blocked or CAPTCHA detected',
                            })
                        }
                        return { property: property.name, status: 'blocked' as const, reviewsInserted }
                    }

                    if (scrapeResult.rateLimited) {
                        if (runId) {
                            await finishScrapeRun(runId, {
                                status: 'partial',
                                reviewsFound,
                                reviewsInserted,
                                reviewsUpdated,
                                attemptCount,
                                errorMessage: 'GraphQL rate limited — backfill_skip preserved for resume',
                                newestReviewAt: newestReviewDate,
                            })
                        }
                        console.log(`  Rate limited — resume later from skip=${scrapeResult.lastSkip}`)
                        return { property: property.name, status: 'partial' as const, reviewsInserted }
                    }

                    if (!scrapeResult.graphqlCaptured) {
                        throw new GraphqlCaptureError('No reviewListFrontend payload captured from Booking.com GraphQL')
                    }

                    const finalDbCount = await countReviewsForProperty(property.id)
                    const caughtUp = finalDbCount >= scrapeResult.reviewsCount
                    if (caughtUp) {
                        await resetBackfillSkip(property.id)
                    }

                    if (runId) {
                        await finishScrapeRun(runId, {
                            status: 'success',
                            reviewsFound,
                            reviewsInserted,
                            reviewsUpdated,
                            attemptCount,
                            newestReviewAt: newestReviewDate,
                        })
                    }

                    await updatePropertyWatermark(property.id, newestReviewDate ?? watermark)

                    console.log(
                        `  Done: ${reviewsFound} parsed, ${reviewsInserted} inserted and ${reviewsUpdated} updated this run, ${finalDbCount}/${scrapeResult.reviewsCount} in DB across ${scrapeResult.pagesFetched} page(s)`,
                    )

                    if (isEmbeddingConfigured() && embeddedReviewIds.length > 0) {
                        try {
                            const embedded = await embedReviewsByIds(embeddedReviewIds)
                            console.log(`  Embedded ${embedded} review(s) for semantic search.`)
                        } catch (embedError) {
                            console.warn('  Embedding step failed (scrape still succeeded):', embedError)
                        }
                    }

                    return { property: property.name, status: 'success' as const, reviewsInserted }
                } finally {
                    await browser.close()
                }
            },
            (attempt) => {
                console.log(`Attempt ${attempt} for ${property.name}`)
            },
        )

        return result
    } catch (error) {
        if (runId) {
            await finishScrapeRun(runId, {
                status: 'failed',
                reviewsFound: 0,
                reviewsInserted: 0,
                reviewsUpdated: 0,
                attemptCount,
                errorMessage: error instanceof Error ? error.message : 'Unknown scrape error',
            })
        }

        return {
            property: property.name,
            status: 'failed' as const,
            reviewsInserted: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

async function main() {
    console.log('ReviewOps scraper starting...')
    await seedProperties()

    const allProperties = await db.select().from(properties)
    const results = []

    for (const property of allProperties) {
        console.log(`\nScraping ${property.name}...`)
        const result = await scrapeSingleProperty(property.id)
        results.push(result)
        console.log(`  → ${result.status}${'reviewsInserted' in result ? ` (${result.reviewsInserted} new)` : ''}`)
        await sleep(SCRAPE_CONFIG.propertyDelayMs)
    }

    console.log('\nScrape summary:')
    for (const result of results) {
        console.log(`- ${result.property}: ${result.status}`)
    }

    await pool.end()
    process.exit(0)
}

main().catch(async (error) => {
    console.error('Scraper failed:', error)
    await pool.end()
    process.exit(1)
})
