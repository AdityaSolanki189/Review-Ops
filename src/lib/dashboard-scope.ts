import type { Route } from 'next'
import { ANALYTICS_TIMEZONE, DEFAULT_SCOPE_DAYS, parseAnalyticsScope, type AnalyticsScope } from '@/lib/analytics'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'

export const PERIOD_PRESETS = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: '365 days', days: 365 },
] as const

/** Earliest date supported for all-time analytics scope */
export const ALL_TIME_FROM = '2018-01-01'

function addCalendarDays(value: string, amount: number): string {
    const parts = value.split('-').map(Number)
    const year = parts[0] ?? 0
    const month = parts[1] ?? 1
    const day = parts[2] ?? 1
    const date = new Date(Date.UTC(year, month - 1, day))
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

export function sydneyToday(now = new Date()): string {
    return formatSydneyDate(now)
}

export function isAllTimeScope(scope: AnalyticsScope, now = new Date()): boolean {
    return scope.from === ALL_TIME_FROM && scope.to === sydneyToday(now)
}

export function isPresetScope(scope: AnalyticsScope, now = new Date()): boolean {
    const today = sydneyToday(now)
    if (scope.to !== today) return false
    const days = scopePeriodDays(scope)
    return PERIOD_PRESETS.some((preset) => preset.days === days)
}

export function isCustomScope(scope: AnalyticsScope, now = new Date()): boolean {
    return !isAllTimeScope(scope, now) && !isPresetScope(scope, now)
}

export function defaultAnalyticsScope(now = new Date()): AnalyticsScope {
    const today = formatSydneyDate(now)
    return {
        from: addCalendarDays(today, -DEFAULT_SCOPE_DAYS),
        to: today,
        compare: 'previous-period',
        timezone: ANALYTICS_TIMEZONE,
    }
}

export function resolveScopeFromSearchParams(searchParams: URLSearchParams, now = new Date()): AnalyticsScope {
    const parsed = parseAnalyticsScope(searchParams, now)
    return parsed.ok ? parsed.value : defaultAnalyticsScope(now)
}

export function scopePeriodDays(scope: AnalyticsScope): number {
    const from = Date.parse(`${scope.from}T00:00:00Z`)
    const to = Date.parse(`${scope.to}T00:00:00Z`)
    return Math.round((to - from) / 86_400_000)
}

export function scopeComparisonLabel(scope: AnalyticsScope, now = new Date()): string {
    if (isAllTimeScope(scope, now)) return 'All time'
    if (isCustomScope(scope, now)) {
        const from = new Date(`${scope.from}T00:00:00`)
        const to = new Date(`${scope.to}T00:00:00`)
        const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
        return `${fmt(from)} – ${fmt(to)} vs previous period`
    }
    const days = scopePeriodDays(scope)
    if (days === 7) return '7 days vs previous 7 days'
    if (days === 30) return '30 days vs previous 30 days'
    if (days === 90) return '90 days vs previous 90 days'
    if (days === 365) return '365 days vs previous 365 days'
    return `${days} days vs previous ${days} days`
}

export function buildScopeSearchParams(scope: AnalyticsScope): URLSearchParams {
    const params = new URLSearchParams()
    if (scope.propertySlug) params.set('property', scope.propertySlug)
    params.set('from', scope.from)
    params.set('to', scope.to)
    params.set('compare', scope.compare)
    params.set('timezone', scope.timezone)
    return params
}

export function buildScopeQueryString(scope: AnalyticsScope): string {
    return buildScopeSearchParams(scope).toString()
}

export function buildDashboardApiUrl(path: string, scope: AnalyticsScope): string {
    const query = buildScopeQueryString(scope)
    return `${path}?${query}`
}

export function buildScopePreset(scope: AnalyticsScope, days: number, now = new Date()): AnalyticsScope {
    const today = formatSydneyDate(now)
    return {
        ...scope,
        propertySlug: scope.propertySlug,
        from: addCalendarDays(today, -days),
        to: today,
        compare: 'previous-period',
        timezone: ANALYTICS_TIMEZONE,
    }
}

export function buildAllTimeScope(scope: AnalyticsScope, now = new Date()): AnalyticsScope {
    const today = formatSydneyDate(now)
    return {
        ...scope,
        propertySlug: scope.propertySlug,
        from: ALL_TIME_FROM,
        to: today,
        compare: 'previous-period',
        timezone: ANALYTICS_TIMEZONE,
    }
}

export function buildCustomScope(scope: AnalyticsScope, from: string, to: string): AnalyticsScope {
    return {
        ...scope,
        propertySlug: scope.propertySlug,
        from,
        to,
        compare: 'previous-period',
        timezone: ANALYTICS_TIMEZONE,
    }
}

export function isoDateFromDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function formatCustomRangeLabel(scope: AnalyticsScope): string {
    const from = new Date(`${scope.from}T00:00:00`)
    const to = new Date(`${scope.to}T00:00:00`)
    const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${fmt(from)} – ${fmt(to)}`
}

export function buildReviewsDrillDownUrl(input: {
    scope: AnalyticsScope
    property?: string
    topic?: ReviewTopicKey
    sentiment?: ReviewSentiment
    ratingBand?: 'low' | 'mid' | 'high'
    representative?: boolean
}): Route {
    const params = new URLSearchParams()
    const property = input.property ?? input.scope.propertySlug
    if (property) params.set('property', property)
    if (input.topic) params.set('topic', input.topic)
    if (input.sentiment) params.set('sentiment', input.sentiment)
    if (input.ratingBand) params.set('ratingBand', input.ratingBand)
    if (input.scope.from) params.set('from', input.scope.from)
    if (input.scope.to) params.set('to', input.scope.to)
    if (input.representative) params.set('representative', 'true')
    const query = params.toString()
    return (query ? `/reviews?${query}` : '/reviews') as Route
}

export function buildPropertyDetailUrl(scope: AnalyticsScope, slug: string): Route {
    const params = buildScopeSearchParams(scope)
    params.set('property', slug)
    return `/properties/${slug}?${params.toString()}` as Route
}

export function buildWeeklyReviewsUrl(weekStart: string, weekEnd: string): Route {
    const params = new URLSearchParams()
    params.set('from', weekStart)
    params.set('to', weekEnd)
    return `/reviews?${params.toString()}` as Route
}

export function shortPropertyName(name: string): string {
    return name.replace('Azzurro Pod Hotel - ', '').replace('Olympic Hotel ', 'Olympic ')
}
