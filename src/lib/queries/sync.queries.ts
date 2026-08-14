import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

type ScrapeHistory = Awaited<ReturnType<typeof import('@/db/queries/analytics').getScrapeRunHistory>>

async function fetchScrapeHistory(limit: number): Promise<ScrapeHistory> {
    return fetchJson(`/api/sync/history?limit=${limit}`)
}

export function useScrapeHistoryQuery(limit = 100) {
    return useQuery({
        queryKey: queryKeys.sync.history(limit),
        queryFn: () => fetchScrapeHistory(limit),
    })
}
