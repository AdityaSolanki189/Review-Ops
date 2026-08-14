import { NextResponse } from 'next/server'
import { getWeeklyStats } from '@/db/queries/analytics'

export async function GET() {
    const data = await getWeeklyStats()
    return NextResponse.json(data)
}
