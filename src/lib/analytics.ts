import { PROPERTY_SEEDS } from '@/lib/properties'

export const ANALYTICS_TIMEZONE = 'Australia/Sydney'
export const DEFAULT_SCOPE_DAYS = 30
export const MAX_SCOPE_DAYS = 366
export const MIN_COMPARISON_SAMPLE_SIZE = 5

export type MetricStatus = 'ok' | 'no_data' | 'insufficient_data'

export interface AnalyticsPeriod {
    from: Date
    to: Date
}

export interface AnalyticsScope extends AnalyticsPeriod {
    property: string | null
    timezone: typeof ANALYTICS_TIMEZONE
    compare: 'previous-period'
    previous: AnalyticsPeriod
}

export interface Metric<T> {
    value: T | null
    previous: T | null
    delta: number | null
    status: MetricStatus
    sampleSize: number
    previousSampleSize: number
}

export interface IssueSignal {
    property: { slug: string; name: string }
    topic: string
    currentRate: number | null
    previousRate: number | null
    momentum: number | null
    ratingGap: number | null
    sampleSize: number
    latestReviewAt: Date | null
    status: MetricStatus
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
    const property = searchParams.get('property')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const compare = searchParams.get('compare') ?? 'previous-period'
    const timezone = searchParams.get('timezone') ?? ANALYTICS_TIMEZONE

    if (property && !PROPERTY_SEEDS.some((item) => item.slug === property)) {
        return { ok: false, error: 'Unknown property.' }
    }
    if (compare !== 'previous-period') return { ok: false, error: 'Unsupported comparison.' }
    if (timezone !== ANALYTICS_TIMEZONE) return { ok: false, error: 'Unsupported timezone.' }
    if ((fromParam && !toParam) || (!fromParam && toParam)) {
        return { ok: false, error: 'Both from and to dates are required.' }
    }

    const today = formatSydneyDate(now)
    const fromDate = fromParam ?? addCalendarDays(today, -DEFAULT_SCOPE_DAYS)
    const toDate = toParam ?? today
    const parsedFrom = parseDateOnly(fromDate)
    const parsedTo = parseDateOnly(toDate)
    if (!parsedFrom || !parsedTo) return { ok: false, error: 'Dates must use YYYY-MM-DD.' }

    const calendarDays = (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000
    if (calendarDays <= 0) return { ok: false, error: 'The date range must not be empty or inverted.' }
    if (calendarDays > MAX_SCOPE_DAYS) return { ok: false, error: 'The date range is too long.' }

    const period = { from: sydneyDateStartToUtc(fromDate), to: sydneyDateStartToUtc(toDate) }
    return {
        ok: true,
        value: {
            ...period,
            property: property ?? null,
            timezone: ANALYTICS_TIMEZONE,
            compare: 'previous-period',
            previous: getPreviousPeriod(period),
        },
    }
}

export function calculateRate(numerator: number, denominator: number): number | null {
    if (denominator === 0) return null
    return (numerator / denominator) * 100
}

export function getSeriesGranularity(calendarDays: number): 'day' | 'week' {
    return calendarDays <= 90 ? 'day' : 'week'
}

export function createMetric<T>(input: {
    value: T | null
    previous: T | null
    sampleSize: number
    previousSampleSize: number
    delta?: number | null
}): Metric<T> {
    const hasValue = input.value !== null
    const hasComparison = input.previous !== null
    const enoughData =
        input.sampleSize >= MIN_COMPARISON_SAMPLE_SIZE && input.previousSampleSize >= MIN_COMPARISON_SAMPLE_SIZE
    const delta =
        hasComparison && enoughData
            ? (input.delta ??
              (typeof input.value === 'number' && typeof input.previous === 'number'
                  ? input.value - input.previous
                  : null))
            : null

    return {
        value: input.value,
        previous: input.previous,
        delta,
        status:
            !hasValue || input.sampleSize === 0 ? 'no_data' : hasComparison && !enoughData ? 'insufficient_data' : 'ok',
        sampleSize: input.sampleSize,
        previousSampleSize: input.previousSampleSize,
    }
}
