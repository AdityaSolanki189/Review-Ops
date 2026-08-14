import { NextResponse } from 'next/server'
import { getScrapeRunHistory } from '@/db/queries/analytics'
import { clampSyncHistoryLimit } from '@/lib/sync-history'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const rawLimit = searchParams.get('limit')
    const limit = clampSyncHistoryLimit(rawLimit ? Number(rawLimit) : undefined)
    const data = await getScrapeRunHistory(limit)
    return NextResponse.json(data)
}
