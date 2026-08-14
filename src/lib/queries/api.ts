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
        const message = await response.text().catch(() => response.statusText)
        throw new ApiError(message || `Request failed: ${response.status}`, response.status)
    }
    const json = (await response.json()) as T
    return reviveDates(json)
}
