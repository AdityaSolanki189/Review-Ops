import type { ReviewFilters } from '@/db/queries/analytics'
import type { AnalyticsScope } from '@/lib/analytics'

export const queryKeys = {
    dashboard: {
        all: ['dashboard'] as const,
        overview: (scope: AnalyticsScope) => ['dashboard', 'overview', scope] as const,
        issues: (scope: AnalyticsScope) => ['dashboard', 'issues', scope] as const,
        topicMatrix: (scope: AnalyticsScope) => ['dashboard', 'topic-matrix', scope] as const,
        series: (scope: AnalyticsScope) => ['dashboard', 'series', scope] as const,
        recentReviews: ['dashboard', 'recent-reviews'] as const,
        syncHealth: ['dashboard', 'sync-health'] as const,
        briefing: (scope: AnalyticsScope) => ['dashboard', 'briefing', scope] as const,
        weeklyStats: ['dashboard', 'weekly-stats'] as const,
        propertyPerformance: ['dashboard', 'property-performance'] as const,
        topicTrends: ['dashboard', 'topic-trends'] as const,
        weeklySeries: ['dashboard', 'weekly-series'] as const,
        ratingDistribution: ['dashboard', 'rating-distribution'] as const,
        weeklyBriefing: ['dashboard', 'weekly-briefing'] as const,
    },
    properties: {
        all: ['properties'] as const,
        list: ['properties', 'list'] as const,
        performance: ['properties', 'performance'] as const,
        detail: (slug: string) => ['property', slug] as const,
        topicMix: (slug: string) => ['property', slug, 'topic-mix'] as const,
    },
    reviews: {
        all: ['reviews'] as const,
        list: (filters: ReviewFilters) => ['reviews', filters] as const,
    },
    sync: {
        all: ['sync'] as const,
        history: (limit: number) => ['sync', 'history', limit] as const,
    },
} as const
