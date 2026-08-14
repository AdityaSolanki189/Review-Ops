import { NextResponse } from 'next/server'
import { getWeeklySnapshot } from '@/db/queries/analytics'

export async function GET() {
    try {
        return NextResponse.json(await getWeeklySnapshot())
    } catch (error) {
        console.error('[dashboard] weekly snapshot failed:', error)
        const message = error instanceof Error ? error.message : 'Failed to load weekly snapshot.'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
