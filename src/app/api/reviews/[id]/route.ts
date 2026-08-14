import { NextResponse } from 'next/server'
import { getReviewById } from '@/db/queries/analytics'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params
    const review = await getReviewById(id)

    if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json(review)
}
