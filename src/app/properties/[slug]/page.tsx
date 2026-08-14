import { Suspense } from 'react'
import { PropertyDetailView } from '@/components/properties/property-detail-view'
import { Skeleton } from '@/components/ui/skeleton'

interface PropertyDetailPageProps {
    params: Promise<{ slug: string }>
}

function PropertyDetailFallback() {
    return <Skeleton className="h-64 w-full" />
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
    const { slug } = await params
    return (
        <Suspense fallback={<PropertyDetailFallback />}>
            <PropertyDetailView slug={slug} />
        </Suspense>
    )
}
