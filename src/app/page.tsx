import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import {
    getNegativeTopicTrends,
    getPropertyPerformance,
    getRatingDistribution,
    getRecentReviews,
    getSyncHealth,
    getWeeklyRatingSeries,
    getWeeklyStats,
} from '@/db/queries/analytics'
import { queryKeys } from '@/lib/queries/keys'

export default async function DashboardPage() {
    const queryClient = new QueryClient()

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.weeklyStats,
            queryFn: () => getWeeklyStats(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.propertyPerformance,
            queryFn: () => getPropertyPerformance(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.topicTrends,
            queryFn: () => getNegativeTopicTrends(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.recentReviews,
            queryFn: async () => (await getRecentReviews({ limit: 6 })).items,
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.syncHealth,
            queryFn: () => getSyncHealth(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.weeklySeries,
            queryFn: () => getWeeklyRatingSeries(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.ratingDistribution,
            queryFn: () => getRatingDistribution(),
        }),
    ])

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DashboardView />
        </HydrationBoundary>
    )
}
