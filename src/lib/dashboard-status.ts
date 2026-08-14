import { formatTopicLabel } from '@/lib/classification/topics'
import type { IssueSignal, Metric } from '@/lib/analytics'
import { shortPropertyName } from '@/lib/dashboard-scope'

export const ANOMALY_MOMENTUM_THRESHOLD = 5

export interface PortfolioStatusSignal {
    kind: 'overall' | 'improvement' | 'attention' | 'complaint' | 'positive' | 'anomaly'
    label: string
    value: string
    detail?: string
    insufficient?: boolean
}

export interface DashboardOverviewLike {
    averageRating: Metric<number>
    reviewActivity: Metric<number>
    lowScoreRate: Metric<number | null>
    topNegativeTopic: {
        topic: string
        negativeMentionRate: number
        momentumPercentagePoints: number | null
        status: Metric<unknown>['status']
        sampleSize: number
    } | null
    topPositiveTopic: {
        topic: string
        positiveMentionRate: number
        status: Metric<unknown>['status']
        sampleSize: number
    } | null
    propertyComparison: Array<{
        property: { slug: string; name: string }
        averageRating: Metric<number>
        reviewActivity: Metric<number>
        lowScoreRate: Metric<number | null>
    }>
}

function formatDelta(value: number | null, suffix = ''): string {
    if (value === null) return 'Not enough data'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}${suffix}`
}

function formatPercent(value: number | null): string {
    if (value === null) return 'No reviews'
    return `${value.toFixed(1)}%`
}

export function isAnomalyIssue(issue: IssueSignal): boolean {
    return (
        issue.status === 'available' &&
        issue.sampleSize >= 5 &&
        issue.momentumPercentagePoints !== null &&
        issue.momentumPercentagePoints >= ANOMALY_MOMENTUM_THRESHOLD
    )
}

function formatPropertySlug(slug: string): string {
    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function buildPortfolioStatus(overview: DashboardOverviewLike, issues: IssueSignal[]): PortfolioStatusSignal[] {
    const signals: PortfolioStatusSignal[] = []

    if (overview.reviewActivity.sampleSize === 0) {
        signals.push({
            kind: 'overall',
            label: 'Overall rating',
            value: 'No reviews',
            detail: 'Widen the period or run a sync',
            insufficient: true,
        })
        return signals
    }

    signals.push({
        kind: 'overall',
        label: 'Overall rating',
        value: overview.averageRating.value === null ? 'No reviews' : `${overview.averageRating.value.toFixed(1)} / 10`,
        detail:
            overview.averageRating.status === 'available'
                ? `${formatDelta(overview.averageRating.delta)} vs previous period`
                : 'Not enough data for comparison',
        insufficient: overview.averageRating.status === 'insufficient_data',
    })

    const improving = overview.propertyComparison
        .filter(
            (row) =>
                row.averageRating.status === 'available' &&
                row.averageRating.delta !== null &&
                row.averageRating.delta > 0 &&
                row.reviewActivity.sampleSize > 0,
        )
        .sort((a, b) => (b.averageRating.delta ?? 0) - (a.averageRating.delta ?? 0))[0]

    if (improving) {
        signals.push({
            kind: 'improvement',
            label: 'Biggest improvement',
            value: shortPropertyName(improving.property.name),
            detail: `${formatDelta(improving.averageRating.delta)} rating`,
        })
    }

    const needsAttention = overview.propertyComparison
        .filter((row) => row.reviewActivity.sampleSize > 0 && row.averageRating.value !== null)
        .sort((a, b) => {
            const deltaA = a.averageRating.delta ?? 0
            const deltaB = b.averageRating.delta ?? 0
            if (deltaA !== deltaB) return deltaA - deltaB
            return (a.averageRating.value ?? 10) - (b.averageRating.value ?? 10)
        })[0]

    if (needsAttention) {
        signals.push({
            kind: 'attention',
            label: 'Needs attention',
            value: shortPropertyName(needsAttention.property.name),
            detail: `${needsAttention.averageRating.value?.toFixed(1)} / 10${
                needsAttention.averageRating.status === 'available'
                    ? ` (${formatDelta(needsAttention.averageRating.delta)})`
                    : ''
            }`,
        })
    }

    const fastestComplaint = issues.find(
        (issue) => issue.status === 'available' && issue.momentumPercentagePoints !== null,
    )

    if (fastestComplaint) {
        signals.push({
            kind: 'complaint',
            label: 'Fastest growing complaint',
            value: formatTopicLabel(fastestComplaint.topic),
            detail: `${formatDelta(fastestComplaint.momentumPercentagePoints, ' pp')} at ${formatPropertySlug(fastestComplaint.propertySlug)}`,
        })
    } else if (overview.topNegativeTopic) {
        signals.push({
            kind: 'complaint',
            label: 'Top negative topic',
            value: formatTopicLabel(overview.topNegativeTopic.topic as Parameters<typeof formatTopicLabel>[0]),
            detail: `${overview.topNegativeTopic.negativeMentionRate.toFixed(1)}% of reviews`,
        })
    }

    if (overview.topPositiveTopic) {
        signals.push({
            kind: 'positive',
            label: 'Strongest positive driver',
            value: formatTopicLabel(overview.topPositiveTopic.topic as Parameters<typeof formatTopicLabel>[0]),
            detail: `${overview.topPositiveTopic.positiveMentionRate.toFixed(1)}% positive mentions`,
        })
    }

    const anomaly = issues.find(isAnomalyIssue)
    if (anomaly) {
        signals.push({
            kind: 'anomaly',
            label: 'Anomaly detected',
            value: formatTopicLabel(anomaly.topic),
            detail: `${formatDelta(anomaly.momentumPercentagePoints, ' pp')} at ${formatPropertySlug(anomaly.propertySlug)}`,
        })
    }

    return signals
}

export function formatMetricDelta(metric: Metric<number | null>, suffix = ''): string {
    if (metric.status !== 'available' || metric.delta === null) return 'Not enough data'
    return `${formatDelta(metric.delta, suffix)} vs previous`
}

export function formatMetricValue(metric: Metric<number | null>, suffix = ''): string {
    if (metric.value === null) return 'No reviews'
    return `${typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}${suffix}`
}

export function portfolioAverageRating(propertyComparison: DashboardOverviewLike['propertyComparison']): number | null {
    const rows = propertyComparison.filter(
        (row) => row.averageRating.value !== null && row.reviewActivity.sampleSize > 0,
    )
    if (rows.length === 0) return null
    const totalReviews = rows.reduce((sum, row) => sum + row.reviewActivity.sampleSize, 0)
    if (totalReviews === 0) return null
    const weighted = rows.reduce((sum, row) => sum + (row.averageRating.value ?? 0) * row.reviewActivity.sampleSize, 0)
    return weighted / totalReviews
}

export function propertyVsPortfolioGap(propertyRating: number | null, portfolioAverage: number | null): number | null {
    if (propertyRating === null || portfolioAverage === null) return null
    return propertyRating - portfolioAverage
}

export { formatPercent }
