'use client'

import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/components/layout/mode-toggle'
import { SyncStatusIndicator } from '@/components/layout/sync-status-indicator'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { shortPropertyName } from '@/lib/dashboard-scope'
import { usePropertiesListQuery } from '@/lib/queries/properties.queries'

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    '/': { title: 'Operations Dashboard', subtitle: 'Portfolio performance' },
    '/reviews': { title: 'Reviews', subtitle: 'Guest evidence' },
    '/properties': { title: 'Properties', subtitle: 'Hotel diagnosis' },
    '/sync': { title: 'Sync status' },
}

function slugToTitle(slug: string): string {
    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function getPropertySlug(pathname: string): string | null {
    if (!pathname.startsWith('/properties/')) return null
    const slug = pathname.slice('/properties/'.length).split('/')[0]
    return slug.length > 0 ? slug : null
}

export function AppHeader() {
    const pathname = usePathname()
    const propertiesQuery = usePropertiesListQuery()
    const propertySlug = getPropertySlug(pathname)

    let title: string
    let subtitle: string | undefined

    if (pageTitles[pathname]) {
        title = pageTitles[pathname].title
        subtitle = pageTitles[pathname].subtitle
    } else if (propertySlug) {
        const property = propertiesQuery.data?.find((item) => item.slug === propertySlug)
        title = property ? shortPropertyName(property.name) : slugToTitle(propertySlug)
        subtitle = 'Hotel diagnosis'
    } else {
        title = 'ReviewOps'
        subtitle = undefined
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex shrink-0 items-center gap-3 md:hidden">
                <SidebarTrigger className="size-9 shrink-0" />
                <Separator orientation="vertical" className="h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
                {subtitle ? <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <SyncStatusIndicator />
                <ModeToggle />
            </div>
        </header>
    )
}
