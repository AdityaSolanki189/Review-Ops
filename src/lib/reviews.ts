import { z } from 'zod'
import { sydneyDateStartToUtc } from '@/lib/analytics'
import { TOPIC_KEYWORDS, type ReviewSentiment, type ReviewTopicKey } from '@/lib/classification/topics'

export const REVIEW_SORTS = ['newest', 'oldest', 'rating-high', 'rating-low'] as const
export type ReviewSort = (typeof REVIEW_SORTS)[number]
export type RatingBand = 'low' | 'mid' | 'high'

export interface ReviewCursor {
    sort: ReviewSort
    value: string
    id: string
    rank?: number
    rating?: string
    reviewDate?: string
}

export interface ParsedReviewFilters {
    propertySlug?: string
    minRating?: number
    maxRating?: number
    topic?: ReviewTopicKey
    sentiment?: ReviewSentiment
    ratingBand?: RatingBand
    from?: Date
    to?: Date
    sort: ReviewSort
    cursor?: string
    limit: number
    representative: boolean
}

const dateOnly = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
        const [year, month, day] = value.split('-').map(Number) as [number, number, number]
        const date = new Date(Date.UTC(year, month - 1, day))
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    }, 'Invalid date')

const optionalFormField = <T extends z.ZodType>(schema: T) =>
    z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

const querySchema = z.object({
    property: optionalFormField(z.string().min(1)),
    minRating: optionalFormField(z.coerce.number().min(1).max(10)),
    maxRating: optionalFormField(z.coerce.number().min(1).max(10)),
    topic: optionalFormField(z.enum(Object.keys(TOPIC_KEYWORDS) as [ReviewTopicKey, ...ReviewTopicKey[]])),
    sentiment: optionalFormField(z.enum(['positive', 'negative', 'neutral'])),
    ratingBand: optionalFormField(z.enum(['low', 'mid', 'high'])),
    from: optionalFormField(dateOnly),
    to: optionalFormField(dateOnly),
    sort: z.enum(REVIEW_SORTS).default('newest'),
    cursor: optionalFormField(z.string().min(1)),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    representative: z.enum(['true', 'false']).default('false'),
})

function addCalendarDay(value: string): string {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number]
    const date = new Date(Date.UTC(year, month - 1, day + 1))
    return date.toISOString().slice(0, 10)
}

export function encodeReviewCursor(cursor: ReviewCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeReviewCursor(cursor: string, sort: ReviewSort): ReviewCursor | null {
    try {
        const parsed = z
            .object({
                sort: z.enum(REVIEW_SORTS),
                value: z.string().min(1),
                id: z.string().min(1),
                rank: z.number().int().min(0).optional(),
                rating: z.string().min(1).optional(),
                reviewDate: z.string().datetime().optional(),
            })
            .safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
        return parsed.success && parsed.data.sort === sort ? parsed.data : null
    } catch {
        return null
    }
}

export function parseReviewFilters(
    searchParams: URLSearchParams,
): { success: true; data: ParsedReviewFilters } | { success: false; error: string } {
    const result = querySchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!result.success) return { success: false, error: result.error.issues[0]?.message ?? 'Invalid review filters.' }

    const { property, from, to, cursor, representative, ...filters } = result.data
    if (from && to && from > to) return { success: false, error: 'The date range is inverted.' }
    const decodedCursor = cursor ? decodeReviewCursor(cursor, filters.sort) : null
    if (cursor && !decodedCursor) return { success: false, error: 'Invalid cursor.' }
    if (representative === 'true' && decodedCursor && (!decodedCursor.rating || !decodedCursor.reviewDate)) {
        return { success: false, error: 'Invalid representative cursor.' }
    }

    return {
        success: true,
        data: {
            ...(property ? { propertySlug: property } : {}),
            ...(filters.minRating !== undefined ? { minRating: filters.minRating } : {}),
            ...(filters.maxRating !== undefined ? { maxRating: filters.maxRating } : {}),
            ...(filters.topic ? { topic: filters.topic } : {}),
            ...(filters.sentiment ? { sentiment: filters.sentiment } : {}),
            ...(filters.ratingBand ? { ratingBand: filters.ratingBand } : {}),
            ...(from ? { from: sydneyDateStartToUtc(from) } : {}),
            ...(to ? { to: sydneyDateStartToUtc(addCalendarDay(to)) } : {}),
            ...(cursor ? { cursor } : {}),
            sort: filters.sort,
            limit: filters.limit,
            representative: representative === 'true',
        },
    }
}

const searchQuerySchema = z.object({
    q: z.string().trim().min(2).max(500),
})

export interface ParsedReviewSearchFilters extends ParsedReviewFilters {
    q: string
}

export function parseReviewSearchParams(
    searchParams: URLSearchParams,
): { success: true; data: ParsedReviewSearchFilters } | { success: false; error: string } {
    const search = searchQuerySchema.safeParse({ q: searchParams.get('q') ?? '' })
    if (!search.success) {
        return { success: false, error: search.error.issues[0]?.message ?? 'Invalid search query.' }
    }

    const filters = parseReviewFilters(searchParams)
    if (!filters.success) return filters

    return {
        success: true,
        data: {
            ...filters.data,
            q: search.data.q,
            limit: Math.min(filters.data.limit, 50),
        },
    }
}
