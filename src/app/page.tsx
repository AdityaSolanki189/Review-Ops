import { Suspense } from 'react'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import {
    getDashboardIssues,
    getDashboardOverview,
    getDashboardSeries,
    getDashboardTopicImpact,
    getDashboardTopicMatrix,
} from '@/db/queries/dashboard-analytics'
import { getAllProperties, getRecentReviews, getSyncHealth, getWeeklySnapshot } from '@/db/queries/analytics'
import { resolveAnalyticsScope } from '@/lib/analytics'
import { defaultAnalyticsScope } from '@/lib/dashboard-scope'
import { queryKeys } from '@/lib/queries/keys'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

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

async function DashboardHydratedContent() {
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
            queryKey: queryKeys.dashboard.topicImpact(scope),
            queryFn: () => getDashboardTopicImpact(resolved),
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
        queryClient.prefetchQuery({
            queryKey: queryKeys.properties.list,
            queryFn: () => getAllProperties(),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.weeklySnapshot,
            queryFn: () => getWeeklySnapshot(),
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

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardFallback />}>
            <DashboardHydratedContent />
        </Suspense>
    )
}
