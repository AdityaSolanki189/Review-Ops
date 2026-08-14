import { PropertyDetailView } from '@/components/properties/property-detail-view'

interface PropertyDetailPageProps {
    params: Promise<{ slug: string }>
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
    const { slug } = await params
    return <PropertyDetailView slug={slug} />
}
