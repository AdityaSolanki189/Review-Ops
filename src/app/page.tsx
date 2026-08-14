import { Suspense } from 'react'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import {
    getDashboardIssues,
    getDashboardOverview,
    getDashboardSeries,
    getDashboardTopicMatrix,
} from '@/db/queries/dashboard-analytics'
import { getRecentReviews, getSyncHealth } from '@/db/queries/analytics'
import { resolveAnalyticsScope } from '@/lib/analytics'
import { defaultAnalyticsScope } from '@/lib/dashboard-scope'
import { queryKeys } from '@/lib/queries/keys'
import { Skeleton } from '@/components/ui/skeleton'

function DashboardFallback() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-40 w-full" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>
    )
}

export default async function DashboardPage() {
    const queryClient = new QueryClient()
    const scope = defaultAnalyticsScope()
    const resolved = resolveAnalyticsScope(scope)

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.overview(scope),
            queryFn: () => getDashboardOverview(resolved),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.issues(scope),
            queryFn: () => getDashboardIssues(resolved),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.topicMatrix(scope),
            queryFn: () => getDashboardTopicMatrix(resolved),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.series(scope),
            queryFn: () => getDashboardSeries(resolved),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.recentReviews,
            queryFn: async () => (await getRecentReviews({ limit: 6 })).items,
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.syncHealth,
            queryFn: () => getSyncHealth(),
        }),
    ])

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<DashboardFallback />}>
                <DashboardView />
            </Suspense>
        </HydrationBoundary>
    )
}
