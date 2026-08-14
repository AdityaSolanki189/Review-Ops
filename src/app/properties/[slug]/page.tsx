import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReviewCard, TopicBar } from '@/components/dashboard/dashboard-parts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPropertyBySlug, getPropertyTopicMix, getRecentReviews } from '@/db/queries/analytics'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'

interface PropertyDetailPageProps {
    params: Promise<{ slug: string }>
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
    const { slug } = await params
    const property = await getPropertyBySlug(slug)

    if (!property) {
        notFound()
    }

    const [topicMix, recentReviews] = await Promise.all([
        getPropertyTopicMix(property.id),
        getRecentReviews({ propertySlug: slug, limit: 10 }),
    ])

    const negativeTopics = topicMix
        .filter((row) => row.sentiment === 'negative')
        .map((row) => ({
            topic: row.topic as ReviewTopicKey,
            count: Number(row.count),
            percentage: 0,
        }))

    const negativeTotal = negativeTopics.reduce((sum, row) => sum + row.count, 0)
    for (const topic of negativeTopics) {
        topic.percentage = negativeTotal > 0 ? Math.round((topic.count / negativeTotal) * 100) : 0
    }

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/properties" className="text-sm text-muted-foreground hover:underline">
                        ← Back to properties
                    </Link>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">{property.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{property.bookingUrl}</p>
                </div>
                <Badge variant="outline">Booking ID: {property.bookingPropertyId}</Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Negative topic mix</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {negativeTopics.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No classified negative topics yet.</p>
                        ) : (
                            negativeTopics.map((topic) => (
                                <TopicBar
                                    key={topic.topic}
                                    topic={topic.topic}
                                    percentage={topic.percentage}
                                    count={topic.count}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All topic signals</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {topicMix.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No topic classifications yet.</p>
                        ) : (
                            topicMix.map((row) => (
                                <Badge key={`${row.topic}-${row.sentiment}`} variant="outline">
                                    {formatTopicLabel(row.topic as ReviewTopicKey)} · {row.sentiment} · {row.count}
                                </Badge>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="mb-4 text-xl font-semibold">Recent reviews</h2>
                <div className="grid gap-4">
                    {recentReviews.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-sm text-muted-foreground">
                                No reviews collected for this property yet.
                            </CardContent>
                        </Card>
                    ) : (
                        recentReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                propertyName={property.name}
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
        </div>
    )
}
