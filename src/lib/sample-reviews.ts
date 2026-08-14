export interface SampleReviewTopic {
    topic: string
    sentiment: string
    confidence: string
}

export interface SampleReviewRecord {
    propertySlug: string
    source: 'booking'
    externalId: string | null
    fingerprint: string
    rating: string
    title: string | null
    positiveText: string | null
    negativeText: string | null
    reviewDate: string
    stayDate: string | null
    reviewerName: string | null
    reviewerCountry: string | null
    roomType: string | null
    travellerType: string | null
    scrapedAt: string
    classifierVersion: number | null
    classifiedAt: string | null
    topics: SampleReviewTopic[]
}

export interface SampleReviewsExport {
    exportedAt: string
    maxReviewsPerProperty: number
    anonymizedReviewerNames: true
    properties: Array<{ slug: string; name: string; reviewCount: number }>
    reviews: SampleReviewRecord[]
}
