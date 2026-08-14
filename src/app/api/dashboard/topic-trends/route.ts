import { NextResponse } from 'next/server'
import { getNegativeTopicTrends } from '@/db/queries/analytics'

export async function GET() {
    const data = await getNegativeTopicTrends()
    return NextResponse.json(data)
}
