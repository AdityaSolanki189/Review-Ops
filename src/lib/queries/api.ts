import { reviveDates } from '@/lib/cache/cached'

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init)
    if (!response.ok) {
        const body = await response.text().catch(() => response.statusText)
        try {
            const parsed = JSON.parse(body) as { error?: string }
            if (parsed.error) {
                throw new ApiError(parsed.error, response.status)
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error
            }
        }
        throw new ApiError(body || `Request failed: ${response.status}`, response.status)
    }
    const json = (await response.json()) as T
    return reviveDates(json)
}
