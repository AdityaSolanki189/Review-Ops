import type { Browser, Page } from 'playwright'
import type { Property } from '@/db/schema'
import { isBlocked } from './blocked'
import { extractReviewCards, parseReviewCards } from './parser'
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

async function openReviewsSection(page: Page): Promise<void> {
    const reviewsTab = page.locator(selectors.reviewsTab).first()
    if (await reviewsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reviewsTab.click().catch(() => undefined)
        await sleep(1000)
    }
}

async function goToNextPage(page: Page): Promise<boolean> {
    const next = page.locator(selectors.nextPage).first()
    if (!(await next.isVisible({ timeout: 2000 }).catch(() => false))) {
        return false
    }

    const disabled = await next.isDisabled().catch(() => true)
    if (disabled) {
        return false
    }

    await next.click()
    await page.waitForLoadState('domcontentloaded')
    await sleep(SCRAPE_CONFIG.pageDelayMs)
    return true
}

export interface ScrapePageResult {
    reviews: ScrapedReview[]
    blocked: boolean
}

export async function scrapePropertyReviews(
    browser: Browser,
    property: Property,
    onPage?: (pageNumber: number, found: number) => void,
): Promise<ScrapePageResult[]> {
    const context = await browser.newContext({
        locale: 'en-AU',
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()
    const results: ScrapePageResult[] = []

    try {
        await page.goto(property.bookingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await dismissCookieBanner(page)

        if (await isBlocked(page)) {
            return [{ reviews: [], blocked: true }]
        }

        await openReviewsSection(page)

        for (let pageNumber = 1; pageNumber <= SCRAPE_CONFIG.maxPages; pageNumber++) {
            if (await isBlocked(page)) {
                results.push({ reviews: [], blocked: true })
                break
            }

            await page.waitForTimeout(1000)
            const rawCards = await extractReviewCards(page)
            const reviews = parseReviewCards(rawCards)
            onPage?.(pageNumber, reviews.length)
            results.push({ reviews, blocked: false })

            const hasNext = await goToNextPage(page)
            if (!hasNext) {
                break
            }
        }
    } finally {
        await context.close()
    }

    return results
}
