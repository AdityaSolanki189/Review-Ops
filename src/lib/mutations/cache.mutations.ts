import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

async function invalidateServerCache(): Promise<{ ok: boolean }> {
    return fetchJson('/api/cache/invalidate', { method: 'POST' })
}

export function useInvalidateCache() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: invalidateServerCache,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
                queryClient.invalidateQueries({ queryKey: queryKeys.properties.all }),
                queryClient.invalidateQueries({ queryKey: ['property'] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
                queryClient.invalidateQueries({ queryKey: queryKeys.sync.all }),
            ])
            toast.success('Dashboard data refreshed')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to refresh data')
        },
    })
}
