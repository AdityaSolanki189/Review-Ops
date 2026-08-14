import { generateText, Output } from 'ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { reviewInsights } from '@/db/schema'
import type { EnrichedReview } from '@/db/queries/analytics'
import { formatTopicLabel } from '@/lib/classification/topics'
import type { ReviewTopicKey } from '@/lib/classification/topics'
import { getOpenRouterModel } from '@/lib/ai/openrouter'
import { env, isOpenRouterConfigured } from '@/lib/config/env'

const insightSchema = z.object({
    summary: z.string().describe('Two or three sentences summarizing the review for hotel ops staff.'),
    strengths: z.array(z.string()).max(4).describe('Concrete positives mentioned by the guest.'),
    issues: z.array(z.string()).max(4).describe('Concrete problems mentioned by the guest.'),
    suggestedAction: z.string().describe('One practical action the hotel team should take.'),
})

export type StoredReviewInsight = {
    summary: string
    strengths: string[]
    issues: string[]
    suggestedAction: string
    model: string
    generatedAt: Date
}

function buildReviewPrompt(review: EnrichedReview): string {
    const topics = review.topics
        .map((topic) => `${formatTopicLabel(topic.topic as ReviewTopicKey)} (${topic.sentiment})`)
        .join(', ')

    return [
        `Property: ${review.property.name}`,
        `Rating: ${review.rating}/10 on Booking.com`,
        `Review date: ${review.reviewDate.toISOString()}`,
        review.reviewerCountry ? `Guest country: ${review.reviewerCountry}` : null,
        review.travellerType ? `Traveller type: ${review.travellerType}` : null,
        review.roomType ? `Room type: ${review.roomType}` : null,
        topics ? `Detected topics: ${topics}` : null,
        review.title ? `Title: ${review.title}` : null,
        review.positiveText ? `Positive text: ${review.positiveText}` : null,
        review.negativeText ? `Negative text: ${review.negativeText}` : null,
    ]
        .filter(Boolean)
        .join('\n')
}

export async function getStoredReviewInsight(reviewId: string): Promise<StoredReviewInsight | null> {
    const [row] = await db.select().from(reviewInsights).where(eq(reviewInsights.reviewId, reviewId)).limit(1)

    if (!row) return null

    return {
        summary: row.summary,
        strengths: row.strengths,
        issues: row.issues,
        suggestedAction: row.suggestedAction,
        model: row.model,
        generatedAt: row.generatedAt,
    }
}

export async function generateReviewInsight(review: EnrichedReview): Promise<StoredReviewInsight> {
    if (!isOpenRouterConfigured()) {
        throw new Error('OPENROUTER_API_KEY is not configured')
    }

    const existing = await getStoredReviewInsight(review.id)
    if (existing) {
        return existing
    }

    const result = await generateText({
        model: getOpenRouterModel(),
        system: 'You summarize hotel guest reviews for operations managers at Azzurro Hotels Sydney. Be direct, practical, and specific. Do not invent facts that are not in the review.',
        prompt: buildReviewPrompt(review),
        output: Output.object({ schema: insightSchema }),
    })

    const output = result.output

    const [saved] = await db
        .insert(reviewInsights)
        .values({
            reviewId: review.id,
            summary: output.summary,
            strengths: output.strengths,
            issues: output.issues,
            suggestedAction: output.suggestedAction,
            model: env.OPENROUTER_MODEL,
        })
        .returning()

    if (!saved) {
        throw new Error('Failed to persist review insight')
    }

    return {
        summary: saved.summary,
        strengths: saved.strengths,
        issues: saved.issues,
        suggestedAction: saved.suggestedAction,
        model: saved.model,
        generatedAt: saved.generatedAt,
    }
}
