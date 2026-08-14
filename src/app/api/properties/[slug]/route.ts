import { NextResponse } from 'next/server'
import { getPropertyBySlug } from '@/db/queries/analytics'

interface RouteContext {
    params: Promise<{ slug: string }>
}

export async function GET(_request: Request, context: RouteContext) {
    const { slug } = await context.params
    const property = await getPropertyBySlug(slug)

    if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
}
