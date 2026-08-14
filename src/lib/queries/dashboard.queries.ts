import { useQuery } from '@tanstack/react-query'
import type { ReviewFilters } from '@/db/queries/analytics'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

type WeeklyStats = Awaited<ReturnType<typeof import('@/db/queries/analytics').getWeeklyStats>>
type PropertyPerformance = Awaited<ReturnType<typeof import('@/db/queries/analytics').getPropertyPerformance>>
type TopicTrends = Awaited<ReturnType<typeof import('@/db/queries/analytics').getNegativeTopicTrends>>
type RecentReviews = Awaited<ReturnType<typeof import('@/db/queries/analytics').getRecentReviews>>
type SyncHealth = Awaited<ReturnType<typeof import('@/db/queries/analytics').getSyncHealth>>

async function fetchWeeklyStats(): Promise<WeeklyStats> {
    return fetchJson('/api/dashboard/weekly-stats')
}

async function fetchPropertyPerformance(): Promise<PropertyPerformance> {
    return fetchJson('/api/dashboard/property-performance')
}

async function fetchTopicTrends(): Promise<TopicTrends> {
    return fetchJson('/api/dashboard/topic-trends')
}

async function fetchDashboardRecentReviews(): Promise<RecentReviews> {
    return fetchJson('/api/dashboard/recent-reviews')
}

async function fetchSyncHealth(): Promise<SyncHealth> {
    return fetchJson('/api/dashboard/sync-health')
}

export function useWeeklyStatsQuery() {
    return useQuery({
        queryKey: queryKeys.dashboard.weeklyStats,
        queryFn: fetchWeeklyStats,
    })
}

export function usePropertyPerformanceQuery() {
    return useQuery({
        queryKey: queryKeys.dashboard.propertyPerformance,
        queryFn: fetchPropertyPerformance,
    })
}

export function useTopicTrendsQuery() {
    return useQuery({
        queryKey: queryKeys.dashboard.topicTrends,
        queryFn: fetchTopicTrends,
    })
}

export function useDashboardRecentReviewsQuery() {
    return useQuery({
        queryKey: queryKeys.dashboard.recentReviews,
        queryFn: fetchDashboardRecentReviews,
    })
}

export function useSyncHealthQuery() {
    return useQuery({
        queryKey: queryKeys.dashboard.syncHealth,
        queryFn: fetchSyncHealth,
    })
}

export type { ReviewFilters }
