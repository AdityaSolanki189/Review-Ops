import { NextResponse } from 'next/server'
import { getRecentReviews } from '@/db/queries/analytics'
import type { ReviewSentiment, ReviewTopicKey } from '@/lib/classification/topics'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const data = await getRecentReviews({
        propertySlug: searchParams.get('property') ?? undefined,
        minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
        maxRating: searchParams.get('maxRating') ? Number(searchParams.get('maxRating')) : undefined,
        topic: (searchParams.get('topic') as ReviewTopicKey | null) ?? undefined,
        sentiment: (searchParams.get('sentiment') as ReviewSentiment | null) ?? undefined,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        cursor: searchParams.get('cursor') ?? undefined,
        limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
    })

    return NextResponse.json(data)
}
