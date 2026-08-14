import type { Page, Request, Response } from 'playwright'
import type { ScrapedReview } from '@/lib/validations/review'
import { parseGraphqlReviewCards } from './parser'

export interface GraphqlReviewCard {
    reviewUrl?: string
    reviewScore?: number
    reviewedDate?: number
    guestDetails?: {
        username?: string | null
        countryName?: string | null
        guestTypeTranslation?: string | null
    } | null
    textDetails?: {
        title?: string | null
        positiveText?: string | null
        negativeText?: string | null
    } | null
    bookingDetails?: {
        checkinDate?: string | null
        roomType?: {
            name?: string | null
        } | null
    } | null
}

export interface ReviewListPayload {
    reviewCard: GraphqlReviewCard[]
    reviewsCount: number
}

export interface CapturedGraphqlRequest {
    url: string
    method: string
    headers: Record<string, string>
    postData: string | null
}

export interface PaginationStopReason {
    stop: boolean
    reason?: 'watermark' | 'consecutive_known' | 'end_of_list' | 'empty_page'
}

export function isReviewListPayload(data: unknown): data is { data: { reviewListFrontend: ReviewListPayload } } {
    if (!data || typeof data !== 'object') return false
    const root = data as { data?: { reviewListFrontend?: ReviewListPayload } }
    return Array.isArray(root.data?.reviewListFrontend?.reviewCard)
}

export function extractReviewListPayload(data: unknown): ReviewListPayload | null {
    if (isReviewListPayload(data)) {
        return data.data.reviewListFrontend
    }

    return findReviewListPayloadDeep(data)
}

function findReviewListPayloadDeep(value: unknown, depth = 0): ReviewListPayload | null {
    if (!value || typeof value !== 'object' || depth > 10) {
        return null
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findReviewListPayloadDeep(item, depth + 1)
            if (found) return found
        }
        return null
    }

    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.reviewCard) && typeof obj.reviewsCount === 'number') {
        return obj as ReviewListPayload
    }

    for (const nested of Object.values(obj)) {
        const found = findReviewListPayloadDeep(nested, depth + 1)
        if (found) return found
    }

    return null
}

export function looksLikeReviewListBody(body: string): boolean {
    return body.includes('"reviewCard"') && body.includes('"reviewsCount"')
}

export function isReviewListRequest(postData: string | null): boolean {
    if (!postData) return false
    const lower = postData.toLowerCase()
    return (
        lower.includes('reviewlistfrontend') ||
        lower.includes('reviewlist') ||
        lower.includes('"reviewcard"') ||
        lower.includes('review_list')
    )
}

export function parseGraphqlResponseBody(body: string): ReviewListPayload | null {
    if (!looksLikeReviewListBody(body)) {
        return null
    }

    try {
        const parsed = JSON.parse(body) as unknown
        return extractReviewListPayload(parsed)
    } catch {
        return null
    }
}

function collectObjects(value: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] {
    if (!value || typeof value !== 'object') return acc
    if (Array.isArray(value)) {
        for (const item of value) {
            collectObjects(item, acc)
        }
        return acc
    }

    acc.push(value as Record<string, unknown>)
    for (const nested of Object.values(value as Record<string, unknown>)) {
        collectObjects(nested, acc)
    }
    return acc
}

export function setPaginationInBody(postData: string, skip: number, sorter = 'NEWEST_FIRST'): string {
    const parsed = JSON.parse(postData) as unknown
    const objects = collectObjects(parsed)

    for (const obj of objects) {
        if ('skip' in obj && typeof obj.skip === 'number') {
            obj.skip = skip
        }
        if ('offset' in obj && typeof obj.offset === 'number') {
            obj.offset = skip
        }
        if ('sorter' in obj) {
            obj.sorter = sorter
        }
        if ('sortBy' in obj) {
            obj.sortBy = sorter
        }
        if ('sortOrder' in obj && sorter === 'NEWEST_FIRST') {
            obj.sortOrder = 'NEWEST_FIRST'
        }
    }

    return JSON.stringify(parsed)
}

export function inferPageLimit(postData: string | null, cardCount: number): number {
    if (!postData) return Math.max(cardCount, 10)

    try {
        const parsed = JSON.parse(postData) as unknown
        const objects = collectObjects(parsed)
        for (const obj of objects) {
            if ('limit' in obj && typeof obj.limit === 'number' && obj.limit > 0) {
                return obj.limit
            }
            if ('rows' in obj && typeof obj.rows === 'number' && obj.rows > 0) {
                return obj.rows
            }
        }
    } catch {
        // fall through
    }

    return Math.max(cardCount, 10)
}

export function shouldStopAfterPage(input: {
    reviews: ScrapedReview[]
    watermark: Date | null
    consecutiveKnown: number
    consecutiveKnownStop: number
    skip: number
    reviewsCount: number
    pageSize: number
}): PaginationStopReason {
    if (input.reviews.length === 0) {
        return { stop: true, reason: 'empty_page' }
    }

    if (input.watermark) {
        const watermarkTime = input.watermark.getTime()
        const hitWatermark = input.reviews.some((review) => review.reviewDate.getTime() <= watermarkTime)
        if (hitWatermark) {
            return { stop: true, reason: 'watermark' }
        }
    }

    if (input.consecutiveKnown >= input.consecutiveKnownStop) {
        return { stop: true, reason: 'consecutive_known' }
    }

    const nextSkip = input.skip + input.pageSize
    if (nextSkip >= input.reviewsCount) {
        return { stop: true, reason: 'end_of_list' }
    }

    return { stop: false }
}

export function maxReviewDate(dates: Date[]): Date | null {
    if (dates.length === 0) return null
    return dates.reduce((max, date) => (date.getTime() > max.getTime() ? date : max))
}

export async function waitForReviewListResponse(page: Page, timeoutMs = 30000): Promise<Response> {
    return page.waitForResponse((response) => response.url().includes('/dml/graphql') && response.status() === 200, {
        timeout: timeoutMs,
    })
}

export async function captureReviewListFromResponse(
    response: Response,
    bodyText?: string,
): Promise<{
    payload: ReviewListPayload
    request: CapturedGraphqlRequest
    reviews: ScrapedReview[]
}> {
    const body = bodyText ?? (await response.text())
    const payload = parseGraphqlResponseBody(body)
    if (!payload) {
        throw new Error('Expected reviewListFrontend payload in GraphQL response')
    }

    const request = response.request()
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(request.headers())) {
        headers[key] = value
    }

    return {
        payload,
        request: {
            url: request.url(),
            method: request.method(),
            headers,
            postData: request.postData(),
        },
        reviews: parseGraphqlReviewCards(payload.reviewCard),
    }
}

export async function waitForReviewListCapture(
    page: Page,
    timeoutMs = 30000,
): Promise<{
    payload: ReviewListPayload
    request: CapturedGraphqlRequest
    reviews: ScrapedReview[]
}> {
    return new Promise((resolve, reject) => {
        let settled = false

        const cleanup = () => {
            settled = true
            page.off('response', onResponse)
            clearTimeout(timeout)
        }

        const timeout = setTimeout(() => {
            cleanup()
            reject(new Error('Timed out waiting for reviewListFrontend GraphQL payload'))
        }, timeoutMs)

        const onResponse = (response: Response) => {
            if (settled || !response.url().includes('/dml/graphql') || response.status() !== 200) {
                return
            }

            void response
                .text()
                .then(async (body) => {
                    if (settled) return
                    const payload = parseGraphqlResponseBody(body)
                    if (!payload) return

                    cleanup()
                    resolve(await captureReviewListFromResponse(response, body))
                })
                .catch(() => undefined)
        }

        page.on('response', onResponse)
    })
}

export async function replayGraphqlRequest(
    page: Page,
    captured: CapturedGraphqlRequest,
    skip: number,
): Promise<{
    payload: ReviewListPayload
    reviews: ScrapedReview[]
}> {
    if (!captured.postData) {
        throw new Error('Cannot replay GraphQL request without POST body')
    }

    const postData = setPaginationInBody(captured.postData, skip)
    const response = await page.request.fetch(captured.url, {
        method: captured.method,
        headers: captured.headers,
        data: postData,
    })

    if (!response.ok()) {
        throw new Error(`GraphQL replay failed with status ${response.status()}`)
    }

    const payload = parseGraphqlResponseBody(await response.text())
    if (!payload) {
        throw new Error('GraphQL replay did not return reviewListFrontend payload')
    }

    return {
        payload,
        reviews: parseGraphqlReviewCards(payload.reviewCard),
    }
}

export class GraphqlRequestCollector {
    private readonly requests: CapturedGraphqlRequest[] = []

    constructor(page: Page) {
        page.on('request', (request) => {
            if (!request.url().includes('/dml/graphql')) {
                return
            }

            const postData = request.postData()
            if (isReviewListRequest(postData)) {
                this.requests.push(requestFromPlaywrightRequest(request))
            }
        })
    }

    findReviewListRequest(): CapturedGraphqlRequest | null {
        return this.requests.at(-1) ?? null
    }
}

export async function captureReviewListFromTemplate(
    page: Page,
    template: CapturedGraphqlRequest,
    skip = 0,
): Promise<{
    payload: ReviewListPayload
    request: CapturedGraphqlRequest
    reviews: ScrapedReview[]
}> {
    const replayed = await replayGraphqlRequest(page, template, skip)
    return {
        payload: replayed.payload,
        request: template,
        reviews: replayed.reviews,
    }
}

export function requestFromPlaywrightRequest(request: Request): CapturedGraphqlRequest {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(request.headers())) {
        headers[key] = value
    }

    return {
        url: request.url(),
        method: request.method(),
        headers,
        postData: request.postData(),
    }
}
