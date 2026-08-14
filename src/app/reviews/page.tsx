import { Suspense } from 'react'
import { ReviewsView } from '@/components/reviews/reviews-view'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default function ReviewsPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-8">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-32 w-full" />
                </div>
            }
        >
            <ReviewsView />
        </Suspense>
    )
}
