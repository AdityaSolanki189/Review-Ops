import { ReviewCard } from '@/components/dashboard/dashboard-parts'
import { ReviewFiltersForm } from '@/components/reviews/review-filters-form'
import { Card, CardContent } from '@/components/ui/card'
import { getAllProperties, getRecentReviews } from '@/db/queries/analytics'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'

interface ReviewsPageProps {
    searchParams: Promise<{
        property?: string
        minRating?: string
        maxRating?: string
        topic?: string
        sentiment?: string
    }>
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
    const params = await searchParams
    const properties = await getAllProperties()

    const reviews = await getRecentReviews({
        propertySlug: params.property,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        maxRating: params.maxRating ? Number(params.maxRating) : undefined,
        topic: params.topic as ReviewTopicKey | undefined,
        sentiment: params.sentiment as ReviewSentiment | undefined,
        limit: 50,
    })

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
                <p className="mt-1 text-muted-foreground">Filter and inspect collected Booking.com reviews</p>
            </div>

            <ReviewFiltersForm properties={properties} params={params} />

            <div className="grid gap-4">
                {reviews.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-sm text-muted-foreground">
                            No reviews match these filters.
                        </CardContent>
                    </Card>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            propertyName={review.property.name}
                            rating={review.rating}
                            title={review.title}
                            excerpt={review.negativeText ?? review.positiveText}
                            reviewDate={review.reviewDate}
                            topics={review.topics}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
