import { NextResponse } from 'next/server'
import { getRatingDistribution } from '@/db/queries/analytics'

export async function GET() {
    const data = await getRatingDistribution()
    return NextResponse.json(data)
}
