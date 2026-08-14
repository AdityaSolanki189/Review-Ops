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
    | 'air_conditioning'
    | 'maintenance'
    | 'housekeeping'
    | 'smell'
    | 'pests'
    | 'room_condition'
    | 'accessibility'
    | 'booking_payment'

export type ReviewSentiment = 'positive' | 'negative' | 'neutral'

export interface TopicMatch {
    topic: ReviewTopicKey
    sentiment: ReviewSentiment
    confidence: number
}

/** Bump when classification logic or taxonomy changes; triggers reclassify backfill. */
export const CLASSIFIER_VERSION = 2

export const TOPIC_KEYWORDS: Record<ReviewTopicKey, string[]> = {
    cleanliness: [
        'dirty',
        'clean',
        'dust',
        'dusty',
        'stain',
        'stained',
        'mould',
        'mold',
        'hygiene',
        'tidy',
        'filthy',
        'spotless',
        'sanitary',
    ],
    noise: ['noise', 'noisy', 'loud', 'traffic', 'music', 'quiet', 'sound', 'thunder', 'party', 'construction'],
    staff: [
        'staff',
        'reception',
        'receptionist',
        'manager',
        'helpful',
        'rude',
        'friendly',
        'service',
        'host',
        'concierge',
    ],
    check_in: [
        'check in',
        'check-in',
        'checkin',
        'arrival',
        'checkout',
        'check out',
        'key card',
        'door code',
        'access code',
        'late night entry',
    ],
    location: [
        'location',
        'central',
        'walk',
        'transport',
        'station',
        'distance',
        'area',
        'neighbourhood',
        'neighborhood',
        'convenient',
    ],
    facilities: [
        'facility',
        'facilities',
        'kitchen',
        'laundry',
        'common area',
        'elevator',
        'lift',
        'gym',
        'pool',
        'lounge',
    ],
    value: ['value', 'price', 'cheap', 'expensive', 'worth', 'money', 'budget', 'cost', 'overpriced', 'affordable'],
    wifi: ['wifi', 'wi-fi', 'internet', 'connection', 'network', 'broadband'],
    food: ['dinner', 'food', 'meal', 'breakfast', 'restaurant', 'chef', 'dining', 'cooked'],
    comfort: ['comfort', 'comfortable', 'bed', 'mattress', 'pillow', 'sleep', 'pod', 'cramped', 'spacious'],
    bathroom: ['shower', 'toilet', 'bathroom', 'ensuite', 'water pressure', 'hot water', 'drain', 'tap'],
    safety: ['security', 'lock', 'theft', 'secure', 'unsafe', 'unsafe area'],
    air_conditioning: [
        'air conditioning',
        'aircon',
        'air con',
        'ac unit',
        'heating',
        'cooling',
        'hot room',
        'cold room',
        'thermostat',
    ],
    maintenance: [
        'broken',
        'repair',
        'maintenance',
        'leak',
        'leaking',
        'faulty',
        'damaged',
        'not working',
        'out of order',
    ],
    housekeeping: [
        'housekeeping',
        'towels',
        'linen',
        'sheets',
        'room service',
        'serviced',
        'housekeeper',
        'fresh towels',
    ],
    smell: ['smell', 'smelled', 'smelly', 'odour', 'odor', 'stink', 'stench', 'musty', 'damp smell', 'sewage'],
    pests: [
        'pest',
        'pests',
        'insect',
        'insects',
        'cockroach',
        'cockroaches',
        'bug',
        'bugs',
        'mouse',
        'rat',
        'bedbug',
        'bed bug',
    ],
    room_condition: ['wall', 'walls', 'ceiling', 'furniture', 'carpet', 'paint', 'peeling', 'crack', 'hole', 'worn'],
    accessibility: ['accessibility', 'accessible', 'wheelchair', 'mobility', 'stairs', 'step', 'ramp', 'disability'],
    booking_payment: [
        'booking',
        'reservation',
        'deposit',
        'refund',
        'payment',
        'charge',
        'billing',
        'cancelled',
        'cancellation',
    ],
}

const POSITIVE_POLARITY = [
    'spotless',
    'clean',
    'tidy',
    'friendly',
    'helpful',
    'quiet',
    'comfortable',
    'comfort',
    'excellent',
    'great',
    'good',
    'wonderful',
    'perfect',
    'amazing',
    'lovely',
    'nice',
    'pleasant',
    'convenient',
    'central',
    'affordable',
    'worth',
    'secure',
    'safe',
    'fast',
    'reliable',
    'spacious',
    'fresh',
]

const NEGATIVE_POLARITY = [
    'dirty',
    'filthy',
    'stained',
    'mould',
    'mold',
    'rude',
    'noisy',
    'loud',
    'broken',
    'leak',
    'leaking',
    'damaged',
    'uncomfortable',
    'cramped',
    'expensive',
    'overpriced',
    'slow',
    'unreliable',
    'unsafe',
    'smelly',
    'stink',
    'musty',
    'pests',
    'cockroach',
    'bedbug',
    'cold',
    'hot',
    'faulty',
    'disappointing',
    'terrible',
    'awful',
    'horrible',
    'poor',
    'bad',
    'worst',
    'unacceptable',
    'unhygienic',
    'unhelpful',
    'unfriendly',
    'unsafe',
    'damp',
    'mouldy',
    'moldy',
]

const NEGATION_WORDS = ['not', "n't", 'no', 'never', 'hardly', 'barely', 'without', 'lack', 'lacking']

const CLAUSE_SPLIT = /\s*[.;]\s*|\s+(?:but|however|although|though|yet|while)\s+/i

export interface ClassificationInput {
    rating: number
    title?: string | null
    positiveText?: string | null
    negativeText?: string | null
}

interface Clause {
    text: string
    fieldPrior: 'positive' | 'negative' | 'neutral'
}

interface TopicEvidence {
    topic: ReviewTopicKey
    positiveScore: number
    negativeScore: number
    cueHits: number
    negativeFieldHits: number
    positiveFieldHits: number
}

const cuePatternCache = new Map<string, RegExp>()

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cuePattern(cue: string): RegExp {
    const cached = cuePatternCache.get(cue)
    if (cached) return cached

    const pattern = new RegExp(`\\b${escapeRegex(cue)}\\b`, 'gi')
    cuePatternCache.set(cue, pattern)
    return pattern
}

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function segmentClauses(text: string, fieldPrior: Clause['fieldPrior']): Clause[] {
    const normalized = normalizeText(text)
    if (!normalized) return []

    return normalized
        .split(CLAUSE_SPLIT)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => ({ text: part, fieldPrior }))
}

function tokenize(text: string): string[] {
    return text.match(/[\w']+/g) ?? []
}

function hasNegationBefore(tokens: string[], index: number): boolean {
    const start = Math.max(0, index - 3)
    for (let i = start; i < index; i++) {
        const token = tokens[i]
        if (!token) continue
        if (NEGATION_WORDS.some((neg) => token === neg || token.endsWith("n't"))) {
            return true
        }
    }
    return false
}

function polarityScoreInClause(clause: string): { positive: number; negative: number } {
    const normalized = normalizeText(clause)
    const tokens = tokenize(normalized)
    let positive = 0
    let negative = 0

    for (const word of POSITIVE_POLARITY) {
        const pattern = cuePattern(word)
        let match: RegExpExecArray | null = pattern.exec(normalized)
        while (match !== null) {
            const tokenIndex = tokens.findIndex((_token, index) => {
                const prefix = tokens.slice(0, index + 1).join(' ')
                const currentMatch = match
                return currentMatch ? prefix.length >= currentMatch.index + currentMatch[0].length : false
            })
            if (!hasNegationBefore(tokens, Math.max(0, tokenIndex))) {
                positive += 1
            }
            match = pattern.exec(normalized)
        }
    }

    for (const word of NEGATIVE_POLARITY) {
        const pattern = cuePattern(word)
        let match: RegExpExecArray | null = pattern.exec(normalized)
        while (match !== null) {
            const tokenIndex = tokens.findIndex((_token, index) => {
                const prefix = tokens.slice(0, index + 1).join(' ')
                const currentMatch = match
                return currentMatch ? prefix.length >= currentMatch.index + currentMatch[0].length : false
            })
            if (!hasNegationBefore(tokens, Math.max(0, tokenIndex))) {
                negative += 1
            }
            match = pattern.exec(normalized)
        }
    }

    return { positive, negative }
}

function countCueHits(clause: string, topic: ReviewTopicKey): number {
    const normalized = normalizeText(clause)
    let hits = 0
    for (const cue of TOPIC_KEYWORDS[topic]) {
        const pattern = cuePattern(cue)
        const matches = normalized.match(pattern)
        if (matches) hits += matches.length
    }
    return hits
}

function resolveSentiment(
    positiveScore: number,
    negativeScore: number,
    rating: number,
    fieldPrior: Clause['fieldPrior'],
): ReviewSentiment {
    if (positiveScore > negativeScore) return 'positive'
    if (negativeScore > positiveScore) return 'negative'

    if (fieldPrior === 'positive' && positiveScore === 0 && negativeScore === 0) {
        return rating >= 7 ? 'positive' : rating <= 5 ? 'negative' : 'neutral'
    }
    if (fieldPrior === 'negative' && positiveScore === 0 && negativeScore === 0) {
        return 'negative'
    }

    if (rating <= 5) return 'negative'
    if (rating >= 8) return 'positive'
    return 'neutral'
}

function computeConfidence(cueHits: number, positiveScore: number, negativeScore: number): number {
    const polarityStrength = Math.max(positiveScore, negativeScore)
    const base = 0.4 + cueHits * 0.12 + polarityStrength * 0.08
    return Math.min(0.98, Math.round(base * 100) / 100)
}

export function classifyReview(input: ClassificationInput): TopicMatch[] {
    const clauses: Clause[] = [
        ...segmentClauses([input.title, input.positiveText].filter(Boolean).join(' '), 'positive'),
        ...segmentClauses([input.title, input.negativeText].filter(Boolean).join(' '), 'negative'),
    ]

    if (clauses.length === 0) return []

    const evidence = new Map<ReviewTopicKey, TopicEvidence>()

    for (const clause of clauses) {
        const polarity = polarityScoreInClause(clause.text)

        for (const topic of Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]) {
            const hits = countCueHits(clause.text, topic)
            if (hits === 0) continue

            const current = evidence.get(topic) ?? {
                topic,
                positiveScore: 0,
                negativeScore: 0,
                cueHits: 0,
                negativeFieldHits: 0,
                positiveFieldHits: 0,
            }

            current.cueHits += hits
            current.positiveScore += polarity.positive
            current.negativeScore += polarity.negative
            if (clause.fieldPrior === 'negative') current.negativeFieldHits += hits
            if (clause.fieldPrior === 'positive') current.positiveFieldHits += hits

            if (current.positiveScore === current.negativeScore) {
                const sentiment = resolveSentiment(0, 0, input.rating, clause.fieldPrior)
                if (sentiment === 'positive') current.positiveScore += 0.5
                if (sentiment === 'negative') current.negativeScore += 0.5
            }

            evidence.set(topic, current)
        }
    }

    const matches: TopicMatch[] = []

    for (const entry of evidence.values()) {
        const fieldPrior: Clause['fieldPrior'] =
            entry.negativeFieldHits > entry.positiveFieldHits
                ? 'negative'
                : entry.positiveFieldHits > entry.negativeFieldHits
                  ? 'positive'
                  : 'neutral'
        const sentiment = resolveSentiment(entry.positiveScore, entry.negativeScore, input.rating, fieldPrior)
        if (sentiment === 'neutral' && entry.cueHits === 1 && entry.positiveScore === 0 && entry.negativeScore === 0) {
            continue
        }

        matches.push({
            topic: entry.topic,
            sentiment,
            confidence: computeConfidence(entry.cueHits, entry.positiveScore, entry.negativeScore),
        })
    }

    return matches.sort((left, right) => right.confidence - left.confidence)
}

export function formatTopicLabel(topic: ReviewTopicKey): string {
    return topic
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}
