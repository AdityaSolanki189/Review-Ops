export type ReviewTopicKey =
    | 'cleanliness'
    | 'noise'
    | 'staff'
    | 'check_in'
    | 'location'
    | 'facilities'
    | 'value'
    | 'wifi'
    | 'food'
    | 'comfort'
    | 'bathroom'
    | 'safety'

export type ReviewSentiment = 'positive' | 'negative' | 'neutral'

export interface TopicMatch {
    topic: ReviewTopicKey
    sentiment: ReviewSentiment
    confidence: number
}

export const TOPIC_KEYWORDS: Record<ReviewTopicKey, string[]> = {
    cleanliness: ['dirty', 'clean', 'dust', 'stain', 'mould', 'mold', 'smell', 'bathroom', 'hygiene', 'tidy'],
    noise: ['noise', 'noisy', 'loud', 'traffic', 'music', 'quiet', 'sound'],
    staff: ['staff', 'reception', 'receptionist', 'manager', 'helpful', 'rude', 'friendly', 'service'],
    check_in: ['check in', 'check-in', 'checkin', 'key', 'arrival', 'checkout', 'check out'],
    location: ['location', 'central', 'walk', 'transport', 'station', 'near', 'distance', 'area'],
    facilities: ['facility', 'facilities', 'kitchen', 'laundry', 'common', 'elevator', 'lift', 'gym'],
    value: ['value', 'price', 'cheap', 'expensive', 'worth', 'money', 'budget', 'cost'],
    wifi: ['wifi', 'wi-fi', 'internet', 'connection', 'network'],
    food: ['dinner', 'food', 'meal', 'breakfast', 'restaurant', 'chef', 'eat'],
    comfort: ['comfort', 'comfortable', 'bed', 'mattress', 'pillow', 'sleep', 'pod', 'room'],
    bathroom: ['shower', 'toilet', 'bathroom', 'ensuite', 'water'],
    safety: ['safe', 'security', 'lock', 'theft', 'unsafe', 'secure'],
}

export interface ClassificationInput {
    rating: number
    title?: string | null
    positiveText?: string | null
    negativeText?: string | null
}

function findMatches(text: string, topic: ReviewTopicKey): string[] {
    const normalized = text.toLowerCase()
    return TOPIC_KEYWORDS[topic].filter((keyword) => normalized.includes(keyword))
}

export function classifyReview(input: ClassificationInput): TopicMatch[] {
    const positiveText = [input.title, input.positiveText].filter(Boolean).join(' ')
    const negativeText = [input.title, input.negativeText].filter(Boolean).join(' ')
    const matches: TopicMatch[] = []

    for (const topic of Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]) {
        const positiveHits = findMatches(positiveText, topic)
        const negativeHits = findMatches(negativeText, topic)

        if (positiveHits.length === 0 && negativeHits.length === 0) {
            continue
        }

        let sentiment: ReviewSentiment = 'neutral'

        if (positiveHits.length > negativeHits.length) {
            sentiment = 'positive'
        } else if (negativeHits.length > positiveHits.length) {
            sentiment = 'negative'
        } else if (positiveHits.length > 0) {
            if (input.rating <= 5) {
                sentiment = 'negative'
            } else if (input.rating >= 8) {
                sentiment = 'positive'
            }
        }

        if (sentiment === 'neutral') {
            if (input.rating <= 5) {
                sentiment = 'negative'
            } else if (input.rating >= 8) {
                sentiment = 'positive'
            }
        }

        const hitCount = Math.max(positiveHits.length, negativeHits.length)
        const confidence = Math.min(0.95, 0.45 + hitCount * 0.15)

        matches.push({ topic, sentiment, confidence })
    }

    return matches
}

export function formatTopicLabel(topic: ReviewTopicKey): string {
    return topic
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}
