import { NextResponse } from 'next/server'
import { getPropertyPerformance } from '@/db/queries/analytics'

export async function GET() {
    const data = await getPropertyPerformance()
    return NextResponse.json(data)
}
