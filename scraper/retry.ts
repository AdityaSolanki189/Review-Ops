import { SCRAPE_CONFIG } from './selectors'

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function jitterDelay(minMs: number, maxMs: number): number {
    return Math.floor(minMs + Math.random() * (maxMs - minMs + 1))
}

export async function sleepJitter(minMs: number, maxMs: number): Promise<void> {
    await sleep(jitterDelay(minMs, maxMs))
}

export async function sleepPageDelay(): Promise<void> {
    await sleepJitter(SCRAPE_CONFIG.pageDelayMinMs, SCRAPE_CONFIG.pageDelayMaxMs)
}

export async function sleepBatchPause(): Promise<void> {
    await sleepJitter(SCRAPE_CONFIG.pageBatchPauseMinMs, SCRAPE_CONFIG.pageBatchPauseMaxMs)
}

export async function withRetry<T>(operation: () => Promise<T>, onAttempt?: (attempt: number) => void): Promise<T> {
    let lastError: unknown

    for (let attempt = 1; attempt <= SCRAPE_CONFIG.retryDelaysMs.length; attempt++) {
        try {
            onAttempt?.(attempt)
            return await operation()
        } catch (error) {
            lastError = error
            const delay = SCRAPE_CONFIG.retryDelaysMs[attempt - 1]
            if (attempt < SCRAPE_CONFIG.retryDelaysMs.length && delay !== undefined) {
                await sleep(delay)
            }
        }
    }

    throw lastError
}
