import { createHash } from 'node:crypto'

function normalize(value: string | null | undefined): string {
    return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export interface FingerprintInput {
    propertyId: string
    reviewerName?: string | null
    reviewDate: Date
    rating: string
    positiveText?: string | null
    negativeText?: string | null
}

export function buildReviewFingerprint(input: FingerprintInput): string {
    const datePart = input.reviewDate.toISOString().slice(0, 10)
    const payload = [
        normalize(input.propertyId),
        normalize(input.reviewerName),
        datePart,
        normalize(input.rating),
        normalize(input.positiveText),
        normalize(input.negativeText),
    ].join('|')

    return createHash('sha256').update(payload).digest('hex')
}

export function buildExternalId(propertyBookingId: string, reviewId: string): string {
    return `booking:${propertyBookingId}:${reviewId}`
}
