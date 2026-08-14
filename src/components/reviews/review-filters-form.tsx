'use client'

import { useId } from 'react'
import type { Property } from '@/db/schema'
import { Select } from '@/components/ui/select'
import { formatTopicLabel, TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'

interface ReviewFiltersFormProps {
    properties: Property[]
    params: {
        property?: string
        minRating?: string
        maxRating?: string
        topic?: string
        sentiment?: string
    }
}

export function ReviewFiltersForm({ properties, params }: ReviewFiltersFormProps) {
    const propertyId = useId()
    const minRatingId = useId()
    const maxRatingId = useId()
    const topicId = useId()
    const sentimentId = useId()
    const topicOptions = Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]

    return (
        <form method="get" className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-5">
            <div className="space-y-2">
                <label htmlFor={propertyId} className="text-sm font-medium">
                    Property
                </label>
                <Select id={propertyId} name="property" defaultValue={params.property ?? ''}>
                    <option value="">All properties</option>
                    {properties.map((property) => (
                        <option key={property.id} value={property.slug}>
                            {property.name}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="space-y-2">
                <label htmlFor={minRatingId} className="text-sm font-medium">
                    Min rating
                </label>
                <Select id={minRatingId} name="minRating" defaultValue={params.minRating ?? ''}>
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                        <option key={rating} value={rating}>
                            {rating}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="space-y-2">
                <label htmlFor={maxRatingId} className="text-sm font-medium">
                    Max rating
                </label>
                <Select id={maxRatingId} name="maxRating" defaultValue={params.maxRating ?? ''}>
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                        <option key={rating} value={rating}>
                            {rating}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="space-y-2">
                <label htmlFor={topicId} className="text-sm font-medium">
                    Topic
                </label>
                <Select id={topicId} name="topic" defaultValue={params.topic ?? ''}>
                    <option value="">All topics</option>
                    {topicOptions.map((topic) => (
                        <option key={topic} value={topic}>
                            {formatTopicLabel(topic)}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="space-y-2">
                <label htmlFor={sentimentId} className="text-sm font-medium">
                    Sentiment
                </label>
                <Select id={sentimentId} name="sentiment" defaultValue={params.sentiment ?? ''}>
                    <option value="">All</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                </Select>
            </div>
            <div className="md:col-span-5">
                <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                    Apply filters
                </button>
            </div>
        </form>
    )
}
