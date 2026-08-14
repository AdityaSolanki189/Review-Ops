import { NextResponse } from 'next/server'
import { getScrapeRunHistory } from '@/db/queries/analytics'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100
    const data = await getScrapeRunHistory(limit)
    return NextResponse.json(data)
}
