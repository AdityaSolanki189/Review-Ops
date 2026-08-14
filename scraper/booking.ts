import type { Browser, Page } from 'playwright'
import type { Property } from '@/db/schema'
import { isBlocked } from './blocked'
import {
    captureReviewListFromTemplate,
    GraphqlRequestCollector,
    inferPageLimit,
    maxReviewDate,
    replayGraphqlRequest,
    shouldStopAfterPage,
    waitForReviewListCapture,
    type CapturedGraphqlRequest,
} from './graphql'
import { sleep } from './retry'
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
    await sleep(1200)
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
            await sleep(1200)
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
        await sleep(1500)
    }

    await scrollToReviews(page)
    await openReviewsSection(page)
    await page.keyboard.press('End').catch(() => undefined)
    await sleep(1500)
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
}

export interface ScrapePageHandlerResult {
    stop: boolean
    consecutiveKnown: number
}

export type ScrapePageHandler = (event: ScrapePageEvent) => Promise<ScrapePageHandlerResult>

export interface ScrapeGraphqlResult {
    blocked: boolean
    graphqlCaptured: boolean
    reviewsCount: number
    reviewsFound: number
    newestReviewDate: Date | null
    pagesFetched: number
}

export async function scrapePropertyReviews(
    browser: Browser,
    property: Property,
    watermark: Date | null,
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
    let newestReviewDate: Date | null = null
    let pagesFetched = 0

    try {
        let captured = await resolveInitialCapture(page, collector, property.bookingUrl)

        if (await isBlocked(page)) {
            return {
                blocked: true,
                graphqlCaptured: false,
                reviewsCount: 0,
                reviewsFound: 0,
                newestReviewDate: null,
                pagesFetched: 0,
            }
        }

        const capturedRequest: CapturedGraphqlRequest = captured.request
        let reviewsCount = captured.payload.reviewsCount
        let skip = 0
        let pageSize = inferPageLimit(capturedRequest.postData, captured.reviews.length)
        let consecutiveKnown = 0
        let pageNumber = 1

        console.log(`  GraphQL captured for ${property.name}: ${reviewsCount} total reviews (page size ${pageSize})`)
        if (watermark) {
            console.log(`  Watermark: ${watermark.toISOString()}`)
        }

        while (pageNumber <= SCRAPE_CONFIG.maxPages) {
            const reviews = captured.reviews
            reviewsFound += reviews.length
            pagesFetched += 1

            const pageNewest = maxReviewDate(reviews.map((review) => review.reviewDate))
            if (pageNewest && (!newestReviewDate || pageNewest.getTime() > newestReviewDate.getTime())) {
                newestReviewDate = pageNewest
            }

            const handlerResult = await onPage({
                pageNumber,
                reviews,
                reviewsCount,
            })
            consecutiveKnown = handlerResult.consecutiveKnown

            const stopDecision = shouldStopAfterPage({
                reviews,
                watermark,
                consecutiveKnown,
                consecutiveKnownStop: SCRAPE_CONFIG.consecutiveKnownStop,
                skip,
                reviewsCount,
                pageSize,
            })

            if (handlerResult.stop || stopDecision.stop) {
                if (stopDecision.reason === 'watermark') {
                    console.log(`  Caught up at watermark (${watermark?.toISOString()})`)
                }
                break
            }

            skip += pageSize
            pageNumber += 1
            await sleep(SCRAPE_CONFIG.pageDelayMs)

            const replayed = await replayGraphqlRequest(page, capturedRequest, skip)
            captured = {
                payload: replayed.payload,
                request: capturedRequest,
                reviews: replayed.reviews,
            }
            reviewsCount = replayed.payload.reviewsCount
            pageSize = inferPageLimit(capturedRequest.postData, replayed.reviews.length)
        }

        return {
            blocked: false,
            graphqlCaptured: true,
            reviewsCount,
            reviewsFound,
            newestReviewDate,
            pagesFetched,
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'BLOCKED') {
            return {
                blocked: true,
                graphqlCaptured: false,
                reviewsCount: 0,
                reviewsFound: 0,
                newestReviewDate: null,
                pagesFetched: 0,
            }
        }

        throw error
    } finally {
        await context.close()
    }
}
