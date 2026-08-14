import {
    calculateRate,
    calculateRatingGap,
    createMetric,
    type IssueSignal,
    type ResolvedAnalyticsScope,
} from '@/lib/analytics'
import { TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'

export interface PeriodSummaryRow {
    averageRating: number | null
    reviewCount: number
    lowScoreCount: number
    latestReviewAt: Date | null
    latestScrapedAt: Date | null
    sources: string[]
}

export interface PropertyRow {
    slug: string
    name: string
}

export interface PropertySummaryRow extends PropertyRow {
    averageRating: number | null
    reviewCount: number
    lowScoreCount: number
}

export interface TopicCountRow {
    topic: ReviewTopicKey
    reviewCount: number
}

export interface IssueRow {
    slug: string
    topic: ReviewTopicKey
    reviewCount: number
    averageRating: number | null
    latestReviewAt: Date | null
}

export interface PropertyCountRow {
    slug: string
    reviewCount: number
}

export function mapOverviewResponse(input: {
    scope: ResolvedAnalyticsScope
    properties: PropertyRow[]
    current: PeriodSummaryRow
    previous: PeriodSummaryRow
    classifiedCurrent: number
    classifiedPrevious: number
    currentTopics: TopicCountRow[]
    previousTopics: TopicCountRow[]
    currentPositiveTopics: TopicCountRow[]
    previousPositiveTopics: TopicCountRow[]
    propertyCurrent: PropertySummaryRow[]
    propertyPrevious: PropertySummaryRow[]
}) {
    const previousTopics = new Map(input.previousTopics.map((row) => [row.topic, row.reviewCount]))
    const previousPositiveTopics = new Map(input.previousPositiveTopics.map((row) => [row.topic, row.reviewCount]))
    const currentByProperty = new Map(input.propertyCurrent.map((row) => [row.slug, row]))
    const previousByProperty = new Map(input.propertyPrevious.map((row) => [row.slug, row]))
    const topTopic = input.currentTopics[0]
    const topPositiveTopicRow = input.currentPositiveTopics[0]
    const topCurrentRate = topTopic ? calculateRate(topTopic.reviewCount, input.current.reviewCount) : null
    const topPreviousRate = topTopic
        ? input.previous.reviewCount > 0
            ? calculateRate(previousTopics.get(topTopic.topic) ?? 0, input.previous.reviewCount)
            : null
        : null
    const topTopicMetric = topTopic
        ? createMetric({
              value: topCurrentRate,
              previousValue: topPreviousRate,
              sampleSize: input.current.reviewCount,
              previousSampleSize: input.previous.reviewCount,
          })
        : null
    const topPositiveCurrentRate = topPositiveTopicRow
        ? calculateRate(topPositiveTopicRow.reviewCount, input.current.reviewCount)
        : null
    const topPositivePreviousRate = topPositiveTopicRow
        ? input.previous.reviewCount > 0
            ? calculateRate(previousPositiveTopics.get(topPositiveTopicRow.topic) ?? 0, input.previous.reviewCount)
            : null
        : null
    const topPositiveMetric = topPositiveTopicRow
        ? createMetric({
              value: topPositiveCurrentRate,
              previousValue: topPositivePreviousRate,
              sampleSize: input.current.reviewCount,
              previousSampleSize: input.previous.reviewCount,
          })
        : null

    return {
        scope: input.scope.public,
        averageRating: createMetric({
            value: input.current.averageRating,
            previousValue: input.previous.averageRating,
            sampleSize: input.current.reviewCount,
            previousSampleSize: input.previous.reviewCount,
        }),
        reviewActivity: createMetric({
            value: input.current.reviewCount,
            previousValue: input.previous.reviewCount,
            sampleSize: input.current.reviewCount,
            previousSampleSize: input.previous.reviewCount,
        }),
        lowScoreRate: createMetric({
            value: calculateRate(input.current.lowScoreCount, input.current.reviewCount),
            previousValue: calculateRate(input.previous.lowScoreCount, input.previous.reviewCount),
            sampleSize: input.current.reviewCount,
            previousSampleSize: input.previous.reviewCount,
        }),
        topNegativeTopic:
            topTopic && topTopicMetric && topCurrentRate !== null
                ? {
                      topic: topTopic.topic,
                      negativeMentionRate: topCurrentRate,
                      previousMentionRate: topPreviousRate,
                      momentumPercentagePoints: topTopicMetric.delta,
                      negativeReviewShare: calculateRate(topTopic.reviewCount, input.current.lowScoreCount),
                      sampleSize: input.current.reviewCount,
                      status: topTopicMetric.status,
                  }
                : null,
        topPositiveTopic:
            topPositiveTopicRow && topPositiveMetric && topPositiveCurrentRate !== null
                ? {
                      topic: topPositiveTopicRow.topic,
                      positiveMentionRate: topPositiveCurrentRate,
                      previousMentionRate: topPositivePreviousRate,
                      momentumPercentagePoints: topPositiveMetric.delta,
                      sampleSize: input.current.reviewCount,
                      status: topPositiveMetric.status,
                  }
                : null,
        freshness: {
            latestReviewAt: input.current.latestReviewAt?.toISOString() ?? null,
            latestScrapedAt: input.current.latestScrapedAt?.toISOString() ?? null,
            sources: input.current.sources,
        },
        classificationCoverage: createMetric({
            value: calculateRate(input.classifiedCurrent, input.current.reviewCount),
            previousValue: calculateRate(input.classifiedPrevious, input.previous.reviewCount),
            sampleSize: input.current.reviewCount,
            previousSampleSize: input.previous.reviewCount,
        }),
        propertyComparison: input.properties.map((property) => {
            const current = currentByProperty.get(property.slug)
            const previous = previousByProperty.get(property.slug)
            const currentReviewCount = current?.reviewCount ?? 0
            const previousReviewCount = previous?.reviewCount ?? 0
            return {
                property,
                averageRating: createMetric({
                    value: current?.averageRating ?? null,
                    previousValue: previous?.averageRating ?? null,
                    sampleSize: currentReviewCount,
                    previousSampleSize: previousReviewCount,
                }),
                reviewActivity: createMetric({
                    value: currentReviewCount,
                    previousValue: previousReviewCount,
                    sampleSize: currentReviewCount,
                    previousSampleSize: previousReviewCount,
                }),
                lowScoreRate: createMetric({
                    value: calculateRate(current?.lowScoreCount ?? 0, currentReviewCount),
                    previousValue: calculateRate(previous?.lowScoreCount ?? 0, previousReviewCount),
                    sampleSize: currentReviewCount,
                    previousSampleSize: previousReviewCount,
                }),
            }
        }),
    }
}

export function mapIssueSignals(input: {
    scope: ResolvedAnalyticsScope
    scopeAverageRating: number | null
    currentIssues: IssueRow[]
    previousIssues: IssueRow[]
    currentProperties: PropertyCountRow[]
    previousProperties: PropertyCountRow[]
}): IssueSignal[] {
    const previousIssueByKey = new Map(input.previousIssues.map((row) => [`${row.slug}:${row.topic}`, row]))
    const currentPropertyBySlug = new Map(input.currentProperties.map((row) => [row.slug, row.reviewCount]))
    const previousPropertyBySlug = new Map(input.previousProperties.map((row) => [row.slug, row.reviewCount]))

    const issues = input.currentIssues.map((row): IssueSignal => {
        const currentSampleSize = currentPropertyBySlug.get(row.slug) ?? 0
        const previousSampleSize = previousPropertyBySlug.get(row.slug) ?? 0
        const previousIssue = previousIssueByKey.get(`${row.slug}:${row.topic}`)
        const negativeMentionRate = calculateRate(row.reviewCount, currentSampleSize) ?? 0
        const previousMentionRate =
            previousSampleSize > 0 ? calculateRate(previousIssue?.reviewCount ?? 0, previousSampleSize) : null
        const metric = createMetric({
            value: negativeMentionRate,
            previousValue: previousMentionRate,
            sampleSize: currentSampleSize,
            previousSampleSize,
        })

        return {
            propertySlug: row.slug,
            topic: row.topic,
            negativeMentionRate,
            previousMentionRate,
            momentumPercentagePoints: metric.delta,
            ratingGap: calculateRatingGap(row.averageRating, input.scopeAverageRating),
            sampleSize: currentSampleSize,
            latestReviewAt: row.latestReviewAt?.toISOString() ?? null,
            status: metric.status,
        }
    })

    return issues.sort(
        (left, right) =>
            (right.momentumPercentagePoints ?? Number.NEGATIVE_INFINITY) -
            (left.momentumPercentagePoints ?? Number.NEGATIVE_INFINITY),
    )
}

export function mapTopicMatrixResponse(input: {
    scope: ResolvedAnalyticsScope
    properties: PropertyRow[]
    totals: PropertyCountRow[]
    classified: PropertyCountRow[]
    topics: Array<{ slug: string; topic: ReviewTopicKey; negativeReviewCount: number }>
}) {
    const totalsByProperty = new Map(input.totals.map((row) => [row.slug, row.reviewCount]))
    const classifiedByProperty = new Map(input.classified.map((row) => [row.slug, row.reviewCount]))
    const topicByProperty = new Map(input.topics.map((row) => [`${row.slug}:${row.topic}`, row]))
    const topics = Object.keys(TOPIC_KEYWORDS) as ReviewTopicKey[]

    return {
        scope: input.scope.public,
        topics,
        rows: input.properties.map((property) => {
            const reviewCount = totalsByProperty.get(property.slug) ?? 0
            return {
                property,
                reviewCount,
                classificationCoverage: calculateRate(classifiedByProperty.get(property.slug) ?? 0, reviewCount),
                cells: Object.fromEntries(
                    topics.map((topic) => {
                        const distinctReviewCount =
                            topicByProperty.get(`${property.slug}:${topic}`)?.negativeReviewCount ?? 0
                        return [
                            topic,
                            {
                                negativeMentionRate: calculateRate(distinctReviewCount, reviewCount),
                                distinctReviewCount,
                            },
                        ]
                    }),
                ) as Record<ReviewTopicKey, { negativeMentionRate: number | null; distinctReviewCount: number }>,
            }
        }),
    }
}
