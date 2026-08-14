import type { ReviewTopicKey } from '@/lib/classification/topics'

export const ANALYTICS_TIMEZONE = 'Australia/Sydney'
export const DEFAULT_SCOPE_DAYS = 30
export const MIN_COMPARISON_SAMPLE_SIZE = 5

export type MetricStatus = 'available' | 'insufficient_data' | 'stale'

export interface AnalyticsScope {
    propertySlug?: string
    from: string
    to: string
    compare: 'previous-period'
    timezone: typeof ANALYTICS_TIMEZONE
}

export interface Metric<T> {
    value: T | null
    previousValue: T | null
    delta: number | null
    sampleSize: number
    status: MetricStatus
}

export interface IssueSignal {
    propertySlug: string
    topic: ReviewTopicKey
    negativeMentionRate: number
    previousMentionRate: number | null
    momentumPercentagePoints: number | null
    ratingGap: number | null
    sampleSize: number
    latestReviewAt: string | null
    status: Metric<unknown>['status']
}

export interface AnalyticsPeriod {
    from: Date
    to: Date
}

export interface ResolvedAnalyticsScope extends AnalyticsPeriod {
    public: AnalyticsScope
    propertySlug?: string
    previous: AnalyticsPeriod
}

export type ScopeParseResult = { ok: true; value: AnalyticsScope } | { ok: false; error: string }

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

    return { year, month, day }
}

function formatSydneyDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: ANALYTICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${value.year}-${value.month}-${value.day}`
}

function addCalendarDays(value: string, amount: number): string {
    const parsed = parseDateOnly(value)
    if (!parsed) throw new Error('Expected a valid ISO date')
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    date.setUTCDate(date.getUTCDate() + amount)
    return date.toISOString().slice(0, 10)
}

function sydneyOffsetMs(utcGuess: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: ANALYTICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(utcGuess)
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return (
        Date.UTC(
            Number(value.year),
            Number(value.month) - 1,
            Number(value.day),
            Number(value.hour),
            Number(value.minute),
            Number(value.second),
        ) - utcGuess.getTime()
    )
}

export function sydneyDateStartToUtc(value: string): Date {
    const parsed = parseDateOnly(value)
    if (!parsed) throw new Error(`Invalid Sydney date: ${value}`)
    const utcGuess = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    const firstPass = new Date(utcGuess.getTime() - sydneyOffsetMs(utcGuess))
    return new Date(utcGuess.getTime() - sydneyOffsetMs(firstPass))
}

export function getPreviousPeriod(period: AnalyticsPeriod): AnalyticsPeriod {
    const fromDate = formatSydneyDate(period.from)
    const toDate = formatSydneyDate(period.to)
    const days = Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000)
    return {
        from: sydneyDateStartToUtc(addCalendarDays(fromDate, -days)),
        to: period.from,
    }
}

export function parseAnalyticsScope(searchParams: URLSearchParams, now = new Date()): ScopeParseResult {
    const propertySlug = searchParams.get('property') || undefined
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const compare = searchParams.get('compare') ?? 'previous-period'
    const timezone = searchParams.get('timezone') ?? ANALYTICS_TIMEZONE

    if (compare !== 'previous-period') return { ok: false, error: 'Unsupported comparison.' }
    if (timezone !== ANALYTICS_TIMEZONE) return { ok: false, error: 'Unsupported timezone.' }
    if ((fromParam && !toParam) || (!fromParam && toParam)) {
        return { ok: false, error: 'Both from and to dates are required.' }
    }

    const today = formatSydneyDate(now)
    const from = fromParam ?? addCalendarDays(today, -DEFAULT_SCOPE_DAYS)
    const to = toParam ?? today
    const parsedFrom = parseDateOnly(from)
    const parsedTo = parseDateOnly(to)
    if (!parsedFrom || !parsedTo) return { ok: false, error: 'Dates must use YYYY-MM-DD.' }

    const calendarDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
    if (calendarDays <= 0) return { ok: false, error: 'The date range must not be empty or inverted.' }

    return {
        ok: true,
        value: {
            ...(propertySlug ? { propertySlug } : {}),
            from,
            to,
            compare: 'previous-period',
            timezone: ANALYTICS_TIMEZONE,
        },
    }
}

export function resolveAnalyticsScope(scope: AnalyticsScope): ResolvedAnalyticsScope {
    const period = {
        from: sydneyDateStartToUtc(scope.from),
        to: sydneyDateStartToUtc(scope.to),
    }
    return {
        public: scope,
        ...(scope.propertySlug ? { propertySlug: scope.propertySlug } : {}),
        ...period,
        previous: getPreviousPeriod(period),
    }
}

export function calculateRate(numerator: number, denominator: number): number | null {
    if (denominator === 0) return null
    return (numerator / denominator) * 100
}

export function calculateRatingGap(topicAverage: number | null, scopeAverage: number | null): number | null {
    return topicAverage === null || scopeAverage === null ? null : topicAverage - scopeAverage
}

export function getSeriesGranularity(calendarDays: number): 'day' | 'week' {
    return calendarDays <= 90 ? 'day' : 'week'
}

export function createMetric<T>(input: {
    value: T | null
    previousValue: T | null
    sampleSize: number
    previousSampleSize: number
    delta?: number | null
    stale?: boolean
}): Metric<T> {
    const enoughData =
        input.value !== null &&
        input.previousValue !== null &&
        input.sampleSize >= MIN_COMPARISON_SAMPLE_SIZE &&
        input.previousSampleSize >= MIN_COMPARISON_SAMPLE_SIZE
    const delta =
        enoughData && typeof input.value === 'number' && typeof input.previousValue === 'number'
            ? (input.delta ?? input.value - input.previousValue)
            : null

    return {
        value: input.value,
        previousValue: input.previousValue,
        delta,
        sampleSize: input.sampleSize,
        status: input.stale ? 'stale' : enoughData ? 'available' : 'insufficient_data',
    }
}
