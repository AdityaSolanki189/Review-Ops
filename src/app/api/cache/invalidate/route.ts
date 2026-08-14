import { NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/cache/cached'

export async function POST() {
    await invalidateCache()
    return NextResponse.json({ ok: true })
}
