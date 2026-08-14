import { SCRAPE_CONFIG } from './selectors'

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
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
