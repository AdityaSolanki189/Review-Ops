import { NextResponse } from 'next/server'
import { getDashboardIssues } from '@/db/queries/dashboard-analytics'
import { parseAnalyticsScope } from '@/lib/analytics'

export async function GET(request: Request) {
    const parsed = parseAnalyticsScope(new URL(request.url).searchParams)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    return NextResponse.json(await getDashboardIssues(parsed.value))
}
