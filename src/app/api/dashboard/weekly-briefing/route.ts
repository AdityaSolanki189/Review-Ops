import { NextResponse } from 'next/server'
import { getWeeklyBriefing } from '@/lib/ai/weekly-briefing'

export async function GET() {
    const data = await getWeeklyBriefing()
    return NextResponse.json(data)
}
