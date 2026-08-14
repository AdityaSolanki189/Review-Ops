import { useQuery } from '@tanstack/react-query'
import type { AnalyticsScope } from '@/lib/analytics'
import { buildDashboardApiUrl } from '@/lib/dashboard-scope'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

type DashboardOverview = Awaited<ReturnType<typeof import('@/db/queries/dashboard-analytics').getDashboardOverview>>
type DashboardIssues = Awaited<ReturnType<typeof import('@/db/queries/dashboard-analytics').getDashboardIssues>>
type DashboardTopicMatrix = Awaited<
    ReturnType<typeof import('@/db/queries/dashboard-analytics').getDashboardTopicMatrix>
>
type DashboardSeries = Awaited<ReturnType<typeof import('@/db/queries/dashboard-analytics').getDashboardSeries>>
type RecentReviews = Awaited<ReturnType<typeof import('@/db/queries/analytics').getRecentReviews>>['items']
type SyncHealth = Awaited<ReturnType<typeof import('@/db/queries/analytics').getSyncHealth>>
type PortfolioBriefing = Awaited<ReturnType<typeof import('@/lib/ai/weekly-briefing').getPortfolioBriefing>>

async function fetchOverview(scope: AnalyticsScope): Promise<DashboardOverview> {
    return fetchJson(buildDashboardApiUrl('/api/dashboard/overview', scope))
}

async function fetchIssues(scope: AnalyticsScope): Promise<DashboardIssues> {
    return fetchJson(buildDashboardApiUrl('/api/dashboard/issues', scope))
}

async function fetchTopicMatrix(scope: AnalyticsScope): Promise<DashboardTopicMatrix> {
    return fetchJson(buildDashboardApiUrl('/api/dashboard/topic-matrix', scope))
}

async function fetchSeries(scope: AnalyticsScope): Promise<DashboardSeries> {
    return fetchJson(buildDashboardApiUrl('/api/dashboard/series', scope))
}

async function fetchDashboardRecentReviews(): Promise<RecentReviews> {
    return fetchJson('/api/dashboard/recent-reviews')
}

async function fetchSyncHealth(): Promise<SyncHealth> {
    return fetchJson('/api/dashboard/sync-health')
}

async function fetchPortfolioBriefing(scope: AnalyticsScope): Promise<PortfolioBriefing> {
    return fetchJson(buildDashboardApiUrl('/api/dashboard/weekly-briefing', scope))
}

export function useDashboardOverviewQuery(scope: AnalyticsScope) {
    return useQuery({
        queryKey: queryKeys.dashboard.overview(scope),
        queryFn: () => fetchOverview(scope),
    })
}

export function useDashboardIssuesQuery(scope: AnalyticsScope) {
    return useQuery({
        queryKey: queryKeys.dashboard.issues(scope),
        queryFn: () => fetchIssues(scope),
    })
}

export function useDashboardTopicMatrixQuery(scope: AnalyticsScope) {
    return useQuery({
        queryKey: queryKeys.dashboard.topicMatrix(scope),
        queryFn: () => fetchTopicMatrix(scope),
    })
}

export function useDashboardSeriesQuery(scope: AnalyticsScope) {
    return useQuery({
        queryKey: queryKeys.dashboard.series(scope),
        queryFn: () => fetchSeries(scope),
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

export function usePortfolioBriefingQuery(scope: AnalyticsScope) {
    return useQuery({
        queryKey: queryKeys.dashboard.briefing(scope),
        queryFn: () => fetchPortfolioBriefing(scope),
        staleTime: 60_000,
    })
}

export type {
    DashboardOverview,
    DashboardIssues,
    DashboardTopicMatrix,
    DashboardSeries,
    PortfolioBriefing,
    RecentReviews,
    SyncHealth,
}
