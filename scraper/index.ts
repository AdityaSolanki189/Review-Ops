import 'dotenv/config'
import { chromium } from 'playwright'
import { eq } from 'drizzle-orm'
import { db, pool } from '@/db'
import { properties } from '@/db/schema'
import { seedProperties } from '@/lib/seed'
import { scrapePropertyReviews } from './booking'
import { createScrapeRun, finishScrapeRun, insertReview, reviewExists } from './deduplicate'
import { maxReviewDate } from './graphql'
import { SCRAPE_CONFIG } from './selectors'
import { sleep, withRetry } from './retry'
import { getPropertyWatermark, updatePropertyWatermark } from './watermark'

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
                    let consecutiveKnown = 0
                    let newestReviewDate: Date | null = null
                    let graphqlCaptured = false

                    const scrapeResult = await scrapePropertyReviews(browser, property, watermark, async (event) => {
                        reviewsFound += event.reviews.length

                        for (const scraped of event.reviews) {
                            const exists = await reviewExists(property, scraped)
                            if (exists) {
                                consecutiveKnown += 1
                                if (consecutiveKnown >= SCRAPE_CONFIG.consecutiveKnownStop) {
                                    return { stop: true, consecutiveKnown }
                                }
                                continue
                            }

                            consecutiveKnown = 0
                            const inserted = await insertReview(property, scraped)
                            if (inserted) {
                                reviewsInserted += 1
                            }
                        }

                        const pageNewest = maxReviewDate(event.reviews.map((review) => review.reviewDate))
                        if (pageNewest && (!newestReviewDate || pageNewest.getTime() > newestReviewDate.getTime())) {
                            newestReviewDate = pageNewest
                        }

                        if (
                            watermark &&
                            event.reviews.some((review) => review.reviewDate.getTime() <= watermark.getTime())
                        ) {
                            return { stop: true, consecutiveKnown }
                        }

                        if (consecutiveKnown >= SCRAPE_CONFIG.consecutiveKnownStop) {
                            return { stop: true, consecutiveKnown }
                        }

                        return { stop: false, consecutiveKnown }
                    })

                    graphqlCaptured = scrapeResult.graphqlCaptured
                    reviewsFound = scrapeResult.reviewsFound
                    if (scrapeResult.newestReviewDate) {
                        newestReviewDate = scrapeResult.newestReviewDate
                    }

                    if (scrapeResult.blocked) {
                        if (runId) {
                            await finishScrapeRun(runId, {
                                status: 'blocked',
                                reviewsFound,
                                reviewsInserted,
                                reviewsUpdated: 0,
                                attemptCount,
                                errorMessage: 'Booking.com blocked or CAPTCHA detected',
                            })
                        }
                        return { property: property.name, status: 'blocked' as const, reviewsInserted }
                    }

                    if (!graphqlCaptured) {
                        throw new GraphqlCaptureError('No reviewListFrontend payload captured from Booking.com GraphQL')
                    }

                    if (runId) {
                        await finishScrapeRun(runId, {
                            status: 'success',
                            reviewsFound,
                            reviewsInserted,
                            reviewsUpdated: 0,
                            attemptCount,
                            newestReviewAt: newestReviewDate,
                        })
                    }

                    await updatePropertyWatermark(property.id, newestReviewDate ?? watermark)

                    console.log(
                        `  Parsed ${reviewsFound}/${scrapeResult.reviewsCount} reviews across ${scrapeResult.pagesFetched} page(s); ${reviewsInserted} inserted`,
                    )

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
