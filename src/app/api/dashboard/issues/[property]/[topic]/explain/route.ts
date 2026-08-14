import { NextResponse } from 'next/server'
import { getIssueExplainer } from '@/lib/ai/issue-explainer'
import { parseAnalyticsScope, resolveAnalyticsScope } from '@/lib/analytics'
import { TOPIC_KEYWORDS, type ReviewTopicKey } from '@/lib/classification/topics'
import { getPropertyBySlug } from '@/db/queries/analytics'

function isReviewTopic(value: string): value is ReviewTopicKey {
    return Object.hasOwn(TOPIC_KEYWORDS, value)
}

async function handleExplain(request: Request, propertySlug: string, topicSlug: string) {
    if (!isReviewTopic(topicSlug)) {
        return NextResponse.json({ error: 'Unknown topic.' }, { status: 400 })
    }

    if (!(await getPropertyBySlug(propertySlug))) {
        return NextResponse.json({ error: 'Unknown property.' }, { status: 404 })
    }

    const parsed = parseAnalyticsScope(new URL(request.url).searchParams)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const scope = resolveAnalyticsScope(parsed.value).public
    const explainer = await getIssueExplainer({
        scope,
        propertySlug,
        topic: topicSlug,
    })

    return NextResponse.json(explainer)
}

export async function GET(request: Request, context: { params: Promise<{ property: string; topic: string }> }) {
    const { property, topic } = await context.params
    return handleExplain(request, property, topic)
}

export async function POST(request: Request, context: { params: Promise<{ property: string; topic: string }> }) {
    const { property, topic } = await context.params
    return handleExplain(request, property, topic)
}
