'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { Property } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatTopicLabel, TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'

interface ReviewFiltersFormProps {
    properties: Property[]
    params: {
        q?: string
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
    const searchId = useId()
    const representativeId = useId()
    const topicOptions = Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]

    const hasAdvancedFilters = Boolean(
        params.minRating ||
            params.maxRating ||
            params.topic ||
            params.sentiment ||
            params.from ||
            params.to ||
            params.representative === 'true',
    )
    const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilters)

    return (
        <form method="get" className="space-y-4 rounded-xl border bg-card p-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 md:col-span-2 xl:col-span-4">
                    <label htmlFor={searchId} className="text-sm font-medium">
                        Search
                    </label>
                    <Input
                        id={searchId}
                        name="q"
                        defaultValue={params.q ?? ''}
                        placeholder="e.g. guests complaining about bathrooms smelling bad"
                        className="min-h-11"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor={propertyId} className="text-sm font-medium">
                        Property
                    </label>
                    <Select id={propertyId} name="property" defaultValue={params.property ?? ''} className="min-h-11">
                        <option value="">All properties</option>
                        {properties.map((property) => (
                            <option key={property.id} value={property.slug}>
                                {property.name}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="space-y-2">
                    <label htmlFor={ratingBandId} className="text-sm font-medium">
                        Rating band
                    </label>
                    <Select
                        id={ratingBandId}
                        name="ratingBand"
                        defaultValue={params.ratingBand ?? ''}
                        className="min-h-11"
                    >
                        <option value="">All ratings</option>
                        <option value="low">Low (≤5)</option>
                        <option value="mid">Mid (&gt;5 and &lt;8)</option>
                        <option value="high">High (≥8)</option>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label htmlFor={sortId} className="text-sm font-medium">
                        Sort
                    </label>
                    <Select id={sortId} name="sort" defaultValue={params.sort ?? 'newest'} className="min-h-11">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="rating-high">Highest rating</option>
                        <option value="rating-low">Lowest rating</option>
                    </Select>
                </div>
                <div className="flex items-end md:col-span-2 xl:col-span-4">
                    <Button type="submit" className="min-h-11 w-full sm:w-auto">
                        Apply filters
                    </Button>
                </div>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-2 px-0">
                        More filters
                        <ChevronDown
                            className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <label htmlFor={minRatingId} className="text-sm font-medium">
                            Min rating
                        </label>
                        <Select
                            id={minRatingId}
                            name="minRating"
                            defaultValue={params.minRating ?? ''}
                            className="min-h-11"
                        >
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
                        <Select
                            id={maxRatingId}
                            name="maxRating"
                            defaultValue={params.maxRating ?? ''}
                            className="min-h-11"
                        >
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
                        <Select id={topicId} name="topic" defaultValue={params.topic ?? ''} className="min-h-11">
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
                        <Select
                            id={sentimentId}
                            name="sentiment"
                            defaultValue={params.sentiment ?? ''}
                            className="min-h-11"
                        >
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
                        <Input
                            id={fromId}
                            name="from"
                            type="date"
                            defaultValue={params.from ?? ''}
                            className="min-h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor={toId} className="text-sm font-medium">
                            To date
                        </label>
                        <Input id={toId} name="to" type="date" defaultValue={params.to ?? ''} className="min-h-11" />
                    </div>
                    <label
                        htmlFor={representativeId}
                        className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-md border px-3 text-sm font-medium"
                    >
                        <input
                            id={representativeId}
                            name="representative"
                            type="checkbox"
                            value="true"
                            defaultChecked={params.representative === 'true'}
                            className="size-4 shrink-0 accent-primary"
                        />
                        Representative evidence first
                    </label>
                </CollapsibleContent>
            </Collapsible>
        </form>
    )
}
