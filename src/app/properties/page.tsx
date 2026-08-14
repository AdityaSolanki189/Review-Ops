import { Suspense } from 'react'
import { PropertiesView } from '@/components/properties/properties-view'
import { Skeleton } from '@/components/ui/skeleton'

function PropertiesFallback() {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
        </div>
    )
}

export default function PropertiesPage() {
    return (
        <Suspense fallback={<PropertiesFallback />}>
            <PropertiesView />
        </Suspense>
    )
}
