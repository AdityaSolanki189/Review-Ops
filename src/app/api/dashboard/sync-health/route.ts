import { NextResponse } from 'next/server'
import { getSyncHealth } from '@/db/queries/analytics'

export async function GET() {
    const data = await getSyncHealth()
    return NextResponse.json(data)
}
