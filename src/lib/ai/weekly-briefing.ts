import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getDashboardIssues, getDashboardOverview } from '@/db/queries/dashboard-analytics'
import { cachedQuery } from '@/lib/cache/cached'
import { getOpenRouterModel } from '@/lib/ai/openrouter'
import { defaultAnalyticsScope } from '@/lib/dashboard-scope'
import { resolveAnalyticsScope, type AnalyticsScope } from '@/lib/analytics'
import { formatTopicLabel } from '@/lib/classification/topics'
import { buildPortfolioStatus, isAnomalyIssue } from '@/lib/dashboard-status'
import { shortPropertyName } from '@/lib/dashboard-scope'
import { isOpenRouterConfigured } from '@/lib/config/env'

const briefingSchema = z.object({
    summary: z.string().describe('Two or three sentences summarizing portfolio review trends.'),
    actions: z.array(z.string()).max(3).describe('Concrete follow-up actions for hotel operations.'),
})

export type PortfolioBriefingResult =
    | {
          available: true
          summary: string
          actions: string[]
          source: 'deterministic' | 'ai'
      }
    | {
          available: false
          message: string
      }

export function buildDeterministicBriefing(
    overview: Awaited<ReturnType<typeof getDashboardOverview>>,
    issues: Awaited<ReturnType<typeof getDashboardIssues>>,
): PortfolioBriefingResult {
    if (overview.reviewActivity.sampleSize === 0) {
        return {
            available: false,
            message: 'No reviews in this period. Widen the date range or run a sync after new guest feedback arrives.',
        }
    }

    const statusSignals = buildPortfolioStatus(overview, issues.issues)
    const overall = statusSignals.find((signal) => signal.kind === 'overall')
    const attention = statusSignals.find((signal) => signal.kind === 'attention')
    const improvement = statusSignals.find((signal) => signal.kind === 'improvement')
    const complaint = statusSignals.find((signal) => signal.kind === 'complaint')
    const anomaly = issues.issues.find(isAnomalyIssue)

    const summaryParts: string[] = []
    if (overall?.value !== 'No reviews') {
        summaryParts.push(
            `Portfolio average rating is ${overall?.value}${overall?.detail ? ` (${overall.detail})` : ''}.`,
        )
    }
    if (attention) {
        summaryParts.push(
            `${attention.value} needs attention with a rating of ${attention.detail?.split(' ')[0] ?? 'below portfolio average'}.`,
        )
    }
    if (improvement) {
        summaryParts.push(`${improvement.value} improved ${improvement.detail ?? 'this period'}.`)
    }
    if (complaint) {
        summaryParts.push(
            `${complaint.value} is the leading operational concern (${complaint.detail ?? 'negative mentions rising'}).`,
        )
    }
    if (anomaly) {
        summaryParts.push(
            `${formatTopicLabel(anomaly.topic)} complaints spiked at ${anomaly.propertySlug.replace(/-/g, ' ')}.`,
        )
    }

    const actions: string[] = []
    if (attention) {
        actions.push(`Review negative feedback for ${attention.value} in the Review Feed.`)
    }
    if (complaint && overview.topNegativeTopic) {
        actions.push(
            `Investigate ${formatTopicLabel(overview.topNegativeTopic.topic)} mentions across affected properties.`,
        )
    }
    if (overview.lowScoreRate.value !== null && overview.lowScoreRate.value > 20) {
        actions.push(
            `Low-score rate is ${overview.lowScoreRate.value.toFixed(1)}%. Prioritize follow-up on ratings ≤5.`,
        )
    }
    if (actions.length === 0 && improvement) {
        actions.push(`Document what is working at ${improvement.value} and share across properties.`)
    }

    return {
        available: true,
        summary: summaryParts.join(' ').trim() || 'Review activity is stable for the selected period.',
        actions: actions.slice(0, 3),
        source: 'deterministic',
    }
}

async function maybeEnhanceWithAi(
    deterministic: Extract<PortfolioBriefingResult, { available: true }>,
    overview: Awaited<ReturnType<typeof getDashboardOverview>>,
    issues: Awaited<ReturnType<typeof getDashboardIssues>>,
): Promise<PortfolioBriefingResult> {
    if (!isOpenRouterConfigured()) return deterministic

    const propertyLines = overview.propertyComparison
        .filter((row) => row.reviewActivity.sampleSize > 0 && row.averageRating.value !== null)
        .map(
            (row) =>
                `${shortPropertyName(row.property.name)}: ${row.averageRating.value?.toFixed(1)} (${row.averageRating.delta !== null ? `${row.averageRating.delta >= 0 ? '+' : ''}${row.averageRating.delta.toFixed(1)}` : 'n/a'} vs prior, ${row.reviewActivity.sampleSize} reviews)`,
        )
        .join('\n')

    const issueLines = issues.issues
        .slice(0, 5)
        .map(
            (issue) =>
                `${issue.propertySlug}/${issue.topic}: ${issue.negativeMentionRate.toFixed(1)}% negative mentions (${issue.momentumPercentagePoints !== null ? `${issue.momentumPercentagePoints >= 0 ? '+' : ''}${issue.momentumPercentagePoints.toFixed(1)} pp` : 'insufficient prior data'})`,
        )
        .join('\n')

    const prompt = [
        `Period: ${overview.scope.from} to ${overview.scope.to}`,
        `Average rating: ${overview.averageRating.value?.toFixed(1) ?? 'n/a'} (${overview.averageRating.delta !== null ? `${overview.averageRating.delta >= 0 ? '+' : ''}${overview.averageRating.delta.toFixed(1)} vs prior` : 'insufficient prior data'})`,
        `Review count: ${overview.reviewActivity.sampleSize}`,
        `Low-score rate: ${overview.lowScoreRate.value?.toFixed(1) ?? 'n/a'}%`,
        'Property comparison:',
        propertyLines || 'No property data.',
        'Top issue momentum:',
        issueLines || 'No negative topic spikes.',
        'Draft briefing to refine:',
        deterministic.summary,
        'Draft actions:',
        deterministic.actions.join('; ') || 'None',
    ].join('\n')

    try {
        const result = await generateText({
            model: getOpenRouterModel(),
            system: 'You write concise operational briefings for Azzurro Hotels Sydney managers. Use only the supplied metrics. Do not invent guest quotes or identities.',
            prompt,
            output: Output.object({ schema: briefingSchema }),
        })

        return {
            available: true,
            summary: result.output.summary,
            actions: result.output.actions,
            source: 'ai',
        }
    } catch {
        return deterministic
    }
}

async function buildPortfolioBriefing(scope: AnalyticsScope): Promise<PortfolioBriefingResult> {
    const resolved = resolveAnalyticsScope(scope)
    const [overview, issues] = await Promise.all([getDashboardOverview(resolved), getDashboardIssues(resolved)])
    const deterministic = buildDeterministicBriefing(overview, issues)
    if (!deterministic.available) return deterministic
    return maybeEnhanceWithAi(deterministic, overview, issues)
}

export async function getPortfolioBriefing(scope?: AnalyticsScope): Promise<PortfolioBriefingResult> {
    const resolvedScope = resolveAnalyticsScope(scope ?? defaultAnalyticsScope())
    const cacheKey = `briefing:${resolvedScope.public.propertySlug ?? 'all'}:${resolvedScope.public.from}:${resolvedScope.public.to}`
    return cachedQuery(cacheKey, 3600, () => buildPortfolioBriefing(resolvedScope.public))
}

/** @deprecated Use getPortfolioBriefing with scope instead */
export async function getWeeklyBriefing(_referenceDate = new Date()): Promise<PortfolioBriefingResult> {
    return getPortfolioBriefing()
}
