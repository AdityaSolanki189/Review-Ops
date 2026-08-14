import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getRecentReviews } from '@/db/queries/analytics'
import { cachedQuery } from '@/lib/cache/cached'
import { getOpenRouterModel } from '@/lib/ai/openrouter'
import { formatTopicLabel, type ReviewTopicKey } from '@/lib/classification/topics'
import { isOpenRouterConfigured } from '@/lib/config/env'
import { resolveAnalyticsScope, type AnalyticsScope } from '@/lib/analytics'

const explainerSchema = z.object({
    themes: z
        .array(
            z.object({
                label: z.string(),
                mentionCount: z.number().int().min(1),
                exampleQuote: z.string(),
            }),
        )
        .max(5),
    rootCauseHypotheses: z.array(z.string()).max(4),
    recommendedActions: z.array(z.string()).max(4),
})

export type IssueExplainerResult =
    | {
          available: true
          themes: z.infer<typeof explainerSchema>['themes']
          rootCauseHypotheses: string[]
          recommendedActions: string[]
          source: 'ai' | 'deterministic'
          reviewCount: number
      }
    | {
          available: false
          message: string
      }

function buildDeterministicExplainer(
    topic: ReviewTopicKey,
    snippets: string[],
): Extract<IssueExplainerResult, { available: true }> {
    return {
        available: true,
        themes: [
            {
                label: `${formatTopicLabel(topic)} complaints`,
                mentionCount: snippets.length,
                exampleQuote: snippets[0]?.slice(0, 180) ?? 'No excerpt available.',
            },
        ],
        rootCauseHypotheses: [
            `Review the ${formatTopicLabel(topic).toLowerCase()} feedback below for recurring patterns.`,
        ],
        recommendedActions: [
            `Inspect representative ${formatTopicLabel(topic).toLowerCase()} reviews and assign an operational owner.`,
        ],
        source: 'deterministic',
        reviewCount: snippets.length,
    }
}

async function buildIssueExplainer(input: {
    scope: AnalyticsScope
    propertySlug: string
    topic: ReviewTopicKey
}): Promise<IssueExplainerResult> {
    const resolved = resolveAnalyticsScope(input.scope)
    const reviews = await getRecentReviews({
        propertySlug: input.propertySlug,
        topic: input.topic,
        sentiment: 'negative',
        from: resolved.from,
        to: resolved.to,
        representative: true,
        sort: 'rating-low',
        limit: 15,
    })

    const snippets = reviews.items
        .map((review) => [review.title, review.negativeText, review.positiveText].filter(Boolean).join(' — '))
        .filter(Boolean)

    if (snippets.length === 0) {
        return {
            available: false,
            message: 'No negative reviews with this topic in the selected period.',
        }
    }

    const deterministic = buildDeterministicExplainer(input.topic, snippets)
    if (!isOpenRouterConfigured()) return deterministic

    const prompt = [
        `Property: ${input.propertySlug}`,
        `Topic: ${formatTopicLabel(input.topic)}`,
        `Period: ${input.scope.from} to ${input.scope.to}`,
        'Representative guest excerpts:',
        snippets.map((snippet, index) => `${index + 1}. ${snippet}`).join('\n'),
    ].join('\n')

    try {
        const result = await generateText({
            model: getOpenRouterModel(),
            system: 'You analyze hotel guest review excerpts for operations managers. Use only the supplied excerpts. Do not invent quotes or guest identities.',
            prompt,
            output: Output.object({ schema: explainerSchema }),
        })

        return {
            available: true,
            themes: result.output.themes,
            rootCauseHypotheses: result.output.rootCauseHypotheses,
            recommendedActions: result.output.recommendedActions,
            source: 'ai',
            reviewCount: snippets.length,
        }
    } catch {
        return deterministic
    }
}

export async function getIssueExplainer(input: {
    scope: AnalyticsScope
    propertySlug: string
    topic: ReviewTopicKey
}): Promise<IssueExplainerResult> {
    const resolved = resolveAnalyticsScope(input.scope)
    const cacheKey = `issue-explainer:${input.propertySlug}:${input.topic}:${resolved.public.from}:${resolved.public.to}`
    return cachedQuery(cacheKey, 3600, () => buildIssueExplainer(input))
}
