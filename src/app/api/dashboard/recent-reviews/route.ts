import { NextResponse } from 'next/server'
import { getRecentReviews } from '@/db/queries/analytics'

export async function GET() {
    const data = await getRecentReviews({ limit: 6 })
    return NextResponse.json(data.items)
}
