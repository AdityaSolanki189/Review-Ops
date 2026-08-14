import { ANALYTICS_TIMEZONE, sydneyDateStartToUtc } from '@/lib/analytics'

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

function addCalendarDays(value: string, amount: number): string {
    const parsed = parseDateOnly(value)
    if (!parsed) throw new Error('Expected a valid ISO date')
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    date.setUTCDate(date.getUTCDate() + amount)
    return date.toISOString().slice(0, 10)
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

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
}

export function getSydneyWeekdayIndex(referenceDate: Date): number {
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: ANALYTICS_TIMEZONE,
        weekday: 'short',
    }).format(referenceDate)
    return WEEKDAY_INDEX[weekday] ?? 0
}

export interface SydneyWeekBounds {
    weekStart: string
    weekEnd: string
    previousWeekStart: string
    previousWeekEnd: string
    thisWeekFromUtc: Date
    thisWeekToExclusiveUtc: Date
    lastWeekFromUtc: Date
    lastWeekToExclusiveUtc: Date
}

export function getSydneyWeekBounds(referenceDate = new Date()): SydneyWeekBounds {
    const today = formatSydneyDate(referenceDate)
    let weekStart = today

    for (let attempt = 0; attempt < 7; attempt += 1) {
        if (getSydneyWeekdayIndex(sydneyDateStartToUtc(weekStart)) === 1) break
        weekStart = addCalendarDays(weekStart, -1)
    }

    const weekEnd = addCalendarDays(weekStart, 6)
    const nextWeekStart = addCalendarDays(weekEnd, 1)
    const previousWeekStart = addCalendarDays(weekStart, -7)
    const previousWeekEnd = addCalendarDays(weekStart, -1)

    return {
        weekStart,
        weekEnd,
        previousWeekStart,
        previousWeekEnd,
        thisWeekFromUtc: sydneyDateStartToUtc(weekStart),
        thisWeekToExclusiveUtc: sydneyDateStartToUtc(nextWeekStart),
        lastWeekFromUtc: sydneyDateStartToUtc(previousWeekStart),
        lastWeekToExclusiveUtc: sydneyDateStartToUtc(weekStart),
    }
}

export function calculateTopicSharePercentage(count: number, total: number): number | null {
    if (total === 0) return null
    return Math.round((count / total) * 100)
}

export function formatNegativeTopicInsight(topicLabel: string, percentage: number): string {
    return `${percentage}% of negative reviews this week mentioned ${topicLabel}.`
}

export function formatPositiveTopicInsight(topicLabel: string, percentage: number): string {
    return `${percentage}% of high-score reviews this week mentioned ${topicLabel}.`
}
