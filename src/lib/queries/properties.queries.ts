import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/queries/api'
import { queryKeys } from '@/lib/queries/keys'

type PropertiesList = Awaited<ReturnType<typeof import('@/db/queries/analytics').getAllProperties>>
type PropertyPerformance = Awaited<ReturnType<typeof import('@/db/queries/analytics').getPropertyPerformance>>
type PropertyDetail = NonNullable<Awaited<ReturnType<typeof import('@/db/queries/analytics').getPropertyBySlug>>>
type PropertyTopicMix = Awaited<ReturnType<typeof import('@/db/queries/analytics').getPropertyTopicMix>>

async function fetchPropertiesList(): Promise<PropertiesList> {
    return fetchJson('/api/properties')
}

async function fetchPropertiesPerformance(): Promise<PropertyPerformance> {
    return fetchJson('/api/properties/performance')
}

async function fetchPropertyBySlug(slug: string): Promise<PropertyDetail> {
    return fetchJson(`/api/properties/${encodeURIComponent(slug)}`)
}

async function fetchPropertyTopicMix(slug: string): Promise<PropertyTopicMix> {
    return fetchJson(`/api/properties/${encodeURIComponent(slug)}/topic-mix`)
}

export function usePropertiesListQuery() {
    return useQuery({
        queryKey: queryKeys.properties.list,
        queryFn: fetchPropertiesList,
    })
}

export function usePropertiesPerformanceQuery() {
    return useQuery({
        queryKey: queryKeys.properties.performance,
        queryFn: fetchPropertiesPerformance,
    })
}

export function usePropertyBySlugQuery(slug: string) {
    return useQuery({
        queryKey: queryKeys.properties.detail(slug),
        queryFn: () => fetchPropertyBySlug(slug),
        enabled: Boolean(slug),
    })
}

export function usePropertyTopicMixQuery(slug: string) {
    return useQuery({
        queryKey: queryKeys.properties.topicMix(slug),
        queryFn: () => fetchPropertyTopicMix(slug),
        enabled: Boolean(slug),
    })
}
