import type { Browser, Page } from 'playwright'
import type { Property } from '@/db/schema'
import { isBlocked } from './blocked'
import {
    captureReviewListFromTemplate,
    estimateTotalPages,
    GraphqlRequestCollector,
    inferPageLimit,
    isGraphqlRateLimitError,
    maxReviewDate,
    replayGraphqlRequest,
    shouldStopAfterPage,
    waitForReviewListCapture,
    type CapturedGraphqlRequest,
} from './graphql'
import { computeResumeSkip } from './watermark'
import { sleep, sleepBatchPause, sleepPageDelay } from './retry'
import { SCRAPE_CONFIG, selectors } from './selectors'
import type { ScrapedReview } from '@/lib/validations/review'

async function dismissCookieBanner(page: Page): Promise<void> {
    const accept = page.locator(selectors.cookieAccept).first()
    if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
        await accept.click().catch(() => undefined)
        await sleep(500)
    }
}

async function scrollToReviews(page: Page): Promise<void> {
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined)
        await page.evaluate(() => {
            const targets = [
                '#customer_reviews',
                '#hp-reviews-sliding',
                '[data-testid="review-score-widget"]',
                '[data-testid="reviews-block"]',
                '#review_list_score',
            ]

            for (const selector of targets) {
                const element = document.querySelector(selector)
                if (element) {
                    element.scrollIntoView({ behavior: 'instant', block: 'center' })
                    return
                }
            }

            window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.65))
        })
    } catch {
        // Navigation can destroy the execution context mid-scroll; safe to continue.
    }
    await sleepPageDelay()
}

async function openReviewsSection(page: Page): Promise<void> {
    const triggers = [
        page.locator(selectors.reviewsTab).first(),
        page.locator('a:has-text("Read all reviews")').first(),
        page.locator('button:has-text("Read all reviews")').first(),
        page.locator('[data-testid="review-score-widget"]').first(),
        page.locator('[data-testid="reviews-block"] a').first(),
        page.locator('div[data-testid="review-score"] a').first(),
    ]

    for (const trigger of triggers) {
        if (await trigger.isVisible({ timeout: 1500 }).catch(() => false)) {
            await trigger.click().catch(() => undefined)
            await sleepPageDelay()
        }
    }
}

async function stimulateReviewGraphql(page: Page, bookingUrl: string): Promise<void> {
    await scrollToReviews(page)
    await openReviewsSection(page)

    const hashUrl = `${bookingUrl.split('#')[0]}#customer_reviews`
    if (!page.url().includes('#customer_reviews')) {
        await page.goto(hashUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined)
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined)
        await dismissCookieBanner(page)
        await sleepPageDelay()
    }

    await scrollToReviews(page)
    await openReviewsSection(page)
    await page.keyboard.press('End').catch(() => undefined)
    await sleepPageDelay()
}

async function resolveInitialCapture(
    page: Page,
    collector: GraphqlRequestCollector,
    bookingUrl: string,
): Promise<{
    payload: Awaited<ReturnType<typeof waitForReviewListCapture>>['payload']
    request: CapturedGraphqlRequest
    reviews: ScrapedReview[]
}> {
    const capturePromise = waitForReviewListCapture(page, 50000)

    await page.goto(bookingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await dismissCookieBanner(page)

    if (await isBlocked(page)) {
        throw new Error('BLOCKED')
    }

    await stimulateReviewGraphql(page, bookingUrl)

    try {
        return await capturePromise
    } catch {
        await stimulateReviewGraphql(page, bookingUrl)

        const template = collector.findReviewListRequest()
        if (template?.postData) {
            console.log('  Falling back to captured GraphQL request template replay')
            return captureReviewListFromTemplate(page, template, 0)
        }

        throw new Error('Timed out waiting for reviewListFrontend GraphQL payload')
    }
}

export interface ScrapePageEvent {
    pageNumber: number
    reviews: ScrapedReview[]
    reviewsCount: number
    skip: number
    pageSize: number
    totalPages: number
    dbCountBeforePage: number
}

export interface ScrapePageHandlerResult {
    stop: boolean
    consecutiveKnown: number
    pageInserted: number
    pageUpdated: number
    dbCountAfterPage: number
}

export type ScrapePageHandler = (event: ScrapePageEvent) => Promise<ScrapePageHandlerResult>

export interface ScrapeOptions {
    dbCount: number
    storedBackfillSkip: number
    watermark: Date | null
}

export interface ScrapeGraphqlResult {
    blocked: boolean
    rateLimited: boolean
    graphqlCaptured: boolean
    backfillMode: boolean
    reviewsCount: number
    reviewsFound: number
    reviewsInserted: number
    reviewsUpdated: number
    newestReviewDate: Date | null
    pagesFetched: number
    lastSkip: number
}

export async function scrapePropertyReviews(
    browser: Browser,
    property: Property,
    options: ScrapeOptions,
    onPage: ScrapePageHandler,
): Promise<ScrapeGraphqlResult> {
    const context = await browser.newContext({
        locale: 'en-AU',
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    const collector = new GraphqlRequestCollector(page)

    let reviewsFound = 0
    let reviewsInserted = 0
    let reviewsUpdated = 0
    let newestReviewDate: Date | null = null
    let pagesFetched = 0
    let lastSkip = 0
    let dbCount = options.dbCount
    let reviewsCount = 0
    let backfillMode = false

    try {
        const initialCapture = await resolveInitialCapture(page, collector, property.bookingUrl)

        if (await isBlocked(page)) {
            return {
                blocked: true,
                rateLimited: false,
                graphqlCaptured: false,
                backfillMode: false,
                reviewsCount: 0,
                reviewsFound: 0,
                reviewsInserted: 0,
                reviewsUpdated: 0,
                newestReviewDate: null,
                pagesFetched: 0,
                lastSkip: options.storedBackfillSkip,
            }
        }

        const capturedRequest: CapturedGraphqlRequest = initialCapture.request
        reviewsCount = initialCapture.payload.reviewsCount
        const pageSize = inferPageLimit(capturedRequest.postData, initialCapture.reviews.length)
        backfillMode = dbCount < reviewsCount
        let skip = computeResumeSkip(options.storedBackfillSkip, dbCount, pageSize, backfillMode)
        let consecutiveKnown = 0
        let pageNumber = 1

        let captured: {
            payload: typeof initialCapture.payload
            request: CapturedGraphqlRequest
            reviews: ScrapedReview[]
        }

        if (backfillMode && skip > 0) {
            console.log(`  Backfill mode: resuming at skip=${skip} (${dbCount}/${reviewsCount} in DB)`)
            const replayed = await replayGraphqlRequest(page, capturedRequest, skip)
            captured = {
                payload: replayed.payload,
                request: capturedRequest,
                reviews: replayed.reviews,
            }
            reviewsCount = replayed.payload.reviewsCount
        } else {
            captured = initialCapture
            if (backfillMode) {
                console.log(`  Backfill mode: starting from skip=0 (${dbCount}/${reviewsCount} in DB)`)
            } else {
                console.log(`  Incremental mode: ${dbCount}/${reviewsCount} in DB`)
            }
        }

        const totalPages = estimateTotalPages(reviewsCount, pageSize)
        console.log(`  GraphQL total ${reviewsCount} reviews · page size ${pageSize} · ~${totalPages} pages`)
        if (!backfillMode && options.watermark) {
            console.log(`  Watermark: ${options.watermark.toISOString()}`)
        }

        while (true) {
            const reviews = captured.reviews
            reviewsFound += reviews.length
            pagesFetched += 1
            lastSkip = skip

            const pageNewest = maxReviewDate(reviews.map((review) => review.reviewDate))
            if (pageNewest && (!newestReviewDate || pageNewest.getTime() > newestReviewDate.getTime())) {
                newestReviewDate = pageNewest
            }

            const dbCountBeforePage = dbCount
            const handlerResult = await onPage({
                pageNumber,
                reviews,
                reviewsCount,
                skip,
                pageSize,
                totalPages,
                dbCountBeforePage,
            })
            consecutiveKnown = handlerResult.consecutiveKnown
            reviewsInserted += handlerResult.pageInserted
            reviewsUpdated += handlerResult.pageUpdated
            dbCount = handlerResult.dbCountAfterPage

            console.log(
                `  page ${pageNumber}/${totalPages} skip=${skip} inserted=${handlerResult.pageInserted} (${dbCount}/${reviewsCount})`,
            )

            const stopDecision = shouldStopAfterPage({
                reviews,
                watermark: options.watermark,
                consecutiveKnown,
                consecutiveKnownStop: SCRAPE_CONFIG.consecutiveKnownStop,
                skip,
                reviewsCount,
                pageSize,
                backfillMode,
                pageNumber,
                maxPagesSafety: SCRAPE_CONFIG.maxPagesSafety,
            })

            if (handlerResult.stop || stopDecision.stop) {
                if (stopDecision.reason === 'watermark') {
                    console.log(`  Caught up at watermark (${options.watermark?.toISOString()})`)
                } else if (stopDecision.reason === 'end_of_list') {
                    console.log(`  Reached end of review list (${reviewsCount} total)`)
                } else if (stopDecision.reason === 'safety_cap') {
                    console.log(`  Stopped at safety page cap (${SCRAPE_CONFIG.maxPagesSafety})`)
                }
                break
            }

            if (pageNumber % SCRAPE_CONFIG.pageBatchPauseEvery === 0) {
                console.log(`  Batch pause after ${pageNumber} pages`)
                await sleepBatchPause()
            }

            skip += pageSize
            pageNumber += 1
            await sleepPageDelay()

            const replayed = await replayGraphqlRequest(page, capturedRequest, skip)
            captured = {
                payload: replayed.payload,
                request: capturedRequest,
                reviews: replayed.reviews,
            }
            reviewsCount = replayed.payload.reviewsCount
        }

        return {
            blocked: false,
            rateLimited: false,
            graphqlCaptured: true,
            backfillMode,
            reviewsCount,
            reviewsFound,
            reviewsInserted,
            reviewsUpdated,
            newestReviewDate,
            pagesFetched,
            lastSkip: skip + pageSize,
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'BLOCKED') {
            return {
                blocked: true,
                rateLimited: false,
                graphqlCaptured: false,
                backfillMode: false,
                reviewsCount: 0,
                reviewsFound,
                reviewsInserted,
                reviewsUpdated,
                newestReviewDate,
                pagesFetched,
                lastSkip,
            }
        }

        if (isGraphqlRateLimitError(error)) {
            return {
                blocked: false,
                rateLimited: true,
                graphqlCaptured: pagesFetched > 0,
                backfillMode,
                reviewsCount,
                reviewsFound,
                reviewsInserted,
                reviewsUpdated,
                newestReviewDate,
                pagesFetched,
                lastSkip,
            }
        }

        throw error
    } finally {
        await context.close()
    }
}
