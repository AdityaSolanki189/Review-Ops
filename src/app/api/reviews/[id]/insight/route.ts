import { NextResponse } from 'next/server'
import { getReviewById } from '@/db/queries/analytics'
import { generateReviewInsight, getStoredReviewInsight } from '@/lib/ai/review-insight'
import { isOpenRouterConfigured } from '@/lib/config/env'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params

    if (!isOpenRouterConfigured()) {
        return NextResponse.json({
            available: false,
            message: 'AI insights need OPENROUTER_API_KEY in your environment.',
        })
    }

    const insight = await getStoredReviewInsight(id)

    if (!insight) {
        return NextResponse.json({
            available: false,
            message: 'No saved insight yet. Generate one from this review.',
        })
    }

    return NextResponse.json({
        available: true,
        insight: {
            ...insight,
            cached: true,
        },
    })
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params

    if (!isOpenRouterConfigured()) {
        return NextResponse.json({
            available: false,
            message: 'AI insights need OPENROUTER_API_KEY in your environment.',
        })
    }

    const review = await getReviewById(id)

    if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const existing = await getStoredReviewInsight(id)
    const insight = existing ?? (await generateReviewInsight(review))

    return NextResponse.json({
        available: true,
        insight: {
            ...insight,
            cached: Boolean(existing),
        },
    })
}
