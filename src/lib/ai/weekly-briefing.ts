import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getNegativeTopicTrends, getPropertyPerformance, getWeeklyStats } from '@/db/queries/analytics'
import { cachedQuery } from '@/lib/cache/cached'
import { getOpenRouterModel } from '@/lib/ai/openrouter'
import { isOpenRouterConfigured } from '@/lib/config/env'
import { formatTopicLabel } from '@/lib/classification/topics'

const briefingSchema = z.object({
    summary: z.string().describe('Three sentences summarizing this week for hotel ops managers.'),
    actions: z.array(z.string()).max(4).describe('Concrete follow-up actions for the hotel team.'),
})

export type WeeklyBriefingResult =
    | {
          available: true
          summary: string
          actions: string[]
      }
    | {
          available: false
          message: string
      }

function startOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
}

async function buildWeeklyBriefing(referenceDate = new Date()): Promise<WeeklyBriefingResult> {
    if (!isOpenRouterConfigured()) {
        return {
            available: false,
            message: 'Weekly AI briefing needs OPENROUTER_API_KEY in your environment.',
        }
    }

    const [weeklyStats, propertyPerformance, topicTrends] = await Promise.all([
        getWeeklyStats(referenceDate),
        getPropertyPerformance(referenceDate),
        getNegativeTopicTrends(referenceDate),
    ])

    if (weeklyStats.thisWeek.reviewCount === 0) {
        return {
            available: false,
            message: 'No reviews this week yet. Run a sync after new guest feedback arrives.',
        }
    }

    const propertyLines = propertyPerformance
        .filter((row) => row.reviewCount > 0)
        .map(
            (row) =>
                `${row.property.name}: ${row.avgRating.toFixed(1)} avg (${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} vs last week, ${row.reviewCount} reviews)`,
        )
        .join('\n')

    const topicLines = topicTrends
        .slice(0, 5)
        .map((row) => `${formatTopicLabel(row.topic)}: ${row.count} mentions (${row.percentage}%)`)
        .join('\n')

    const prompt = [
        `Portfolio average this week: ${weeklyStats.thisWeek.avgRating.toFixed(1)} (${weeklyStats.thisWeek.reviewCount} reviews)`,
        `Last week average: ${weeklyStats.lastWeek.avgRating.toFixed(1)} (${weeklyStats.lastWeek.reviewCount} reviews)`,
        'Property performance:',
        propertyLines || 'No property-level reviews this week.',
        'Top negative topics:',
        topicLines || 'No negative topics this week.',
    ].join('\n')

    const result = await generateText({
        model: getOpenRouterModel(),
        system: 'You write concise weekly review briefings for Azzurro Hotels Sydney operations managers. Focus on what changed, what is hurting scores, and what to do next.',
        prompt,
        output: Output.object({ schema: briefingSchema }),
    })

    return {
        available: true,
        summary: result.output.summary,
        actions: result.output.actions,
    }
}

export async function getWeeklyBriefing(referenceDate = new Date()): Promise<WeeklyBriefingResult> {
    const weekKey = startOfWeek(referenceDate).toISOString().slice(0, 10)
    return cachedQuery(`briefing:${weekKey}`, 3600, () => buildWeeklyBriefing(referenceDate))
}
