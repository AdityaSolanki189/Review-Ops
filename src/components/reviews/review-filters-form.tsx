'use client'

import { useId } from 'react'
import type { Property } from '@/db/schema'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatTopicLabel, TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'

interface ReviewFiltersFormProps {
    properties: Property[]
    params: {
        property?: string
        minRating?: string
        maxRating?: string
        ratingBand?: string
        topic?: string
        sentiment?: string
        from?: string
        to?: string
        sort?: string
        representative?: string
    }
    onSubmit?: () => void
}

export function ReviewFiltersForm({ properties, params, onSubmit }: ReviewFiltersFormProps) {
    const propertyId = useId()
    const minRatingId = useId()
    const maxRatingId = useId()
    const ratingBandId = useId()
    const topicId = useId()
    const sentimentId = useId()
    const fromId = useId()
    const toId = useId()
    const sortId = useId()
    const topicOptions = Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]

    return (
        <form
            method="get"
            className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-3 xl:grid-cols-4"
            onSubmit={onSubmit}
        >
            <div className="space-y-2">
                <label htmlFor={ratingBandId} className="text-sm font-medium">
                    Rating band
                </label>
                <Select id={ratingBandId} name="ratingBand" defaultValue={params.ratingBand ?? ''}>
                    <option value="">All ratings</option>
                    <option value="low">Low (≤5)</option>
                    <option value="mid">Mid (&gt;5 and &lt;8)</option>
                    <option value="high">High (≥8)</option>
                </Select>
            </div>
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
                <label htmlFor={sortId} className="text-sm font-medium">
                    Sort
                </label>
                <Select id={sortId} name="sort" defaultValue={params.sort ?? 'newest'}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="rating-high">Highest rating</option>
                    <option value="rating-low">Lowest rating</option>
                </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                <input
                    name="representative"
                    type="checkbox"
                    value="true"
                    defaultChecked={params.representative === 'true'}
                />
                Representative evidence first
            </label>
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
            <div className="space-y-2">
                <label htmlFor={fromId} className="text-sm font-medium">
                    From date
                </label>
                <Input id={fromId} name="from" type="date" defaultValue={params.from ?? ''} />
            </div>
            <div className="space-y-2">
                <label htmlFor={toId} className="text-sm font-medium">
                    To date
                </label>
                <Input id={toId} name="to" type="date" defaultValue={params.to ?? ''} />
            </div>
            <div className="flex items-end md:col-span-3 xl:col-span-4">
                <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                    Apply filters
                </button>
            </div>
        </form>
    )
}
