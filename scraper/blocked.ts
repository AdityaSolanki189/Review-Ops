import type { Page } from 'playwright'
import { selectors } from './selectors'

export async function isBlocked(page: Page): Promise<boolean> {
    const url = page.url()
    if (url.includes('challenge') || url.includes('captcha')) {
        return true
    }

    for (const selector of selectors.blockedIndicators.split(', ')) {
        const count = await page.locator(selector).count()
        if (count > 0) {
            return true
        }
    }

    const title = await page.title()
    if (/access denied|verify you are human|security check/i.test(title)) {
        return true
    }

    return false
}
