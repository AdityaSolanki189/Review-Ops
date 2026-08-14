import { NextResponse } from 'next/server'
import { getPropertyBySlug } from '@/db/queries/analytics'
import { parseAnalyticsScope, resolveAnalyticsScope, type ResolvedAnalyticsScope } from '@/lib/analytics'

type AnalyticsLoader<T> = (scope: ResolvedAnalyticsScope) => Promise<T>
type PropertyExists = (slug: string) => Promise<boolean>

async function databasePropertyExists(slug: string): Promise<boolean> {
    return (await getPropertyBySlug(slug)) !== null
}

export function createDashboardRoute<T>(
    load: AnalyticsLoader<T>,
    propertyExists: PropertyExists = databasePropertyExists,
) {
    return async function GET(request: Request) {
        const parsed = parseAnalyticsScope(new URL(request.url).searchParams)
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

        if (parsed.value.propertySlug && !(await propertyExists(parsed.value.propertySlug))) {
            return NextResponse.json({ error: 'Unknown property.' }, { status: 400 })
        }

        try {
            return NextResponse.json(await load(resolveAnalyticsScope(parsed.value)))
        } catch (error) {
            console.error('[dashboard] route loader failed:', error)
            const message = error instanceof Error ? error.message : 'Failed to load dashboard analytics.'
            return NextResponse.json({ error: message }, { status: 500 })
        }
    }
}
