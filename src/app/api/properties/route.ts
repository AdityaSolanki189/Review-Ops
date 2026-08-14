import { NextResponse } from 'next/server'
import { getAllProperties } from '@/db/queries/analytics'

export async function GET() {
    const data = await getAllProperties()
    return NextResponse.json(data)
}
