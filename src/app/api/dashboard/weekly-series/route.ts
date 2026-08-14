import { NextResponse } from 'next/server'
import { getWeeklyRatingSeries } from '@/db/queries/analytics'

export async function GET() {
    const data = await getWeeklyRatingSeries()
    return NextResponse.json(data)
}
