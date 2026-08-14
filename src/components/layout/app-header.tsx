'use client'

import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/components/layout/mode-toggle'
import { SyncStatusIndicator } from '@/components/layout/sync-status-indicator'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    '/': { title: 'Operations Dashboard', subtitle: 'Portfolio performance' },
    '/reviews': { title: 'Reviews', subtitle: 'Guest evidence' },
    '/properties': { title: 'Properties', subtitle: 'Hotel diagnosis' },
    '/sync': { title: 'Sync status' },
}

function getPageMeta(pathname: string): { title: string; subtitle?: string } {
    if (pageTitles[pathname]) return pageTitles[pathname]
    if (pathname.startsWith('/properties/')) return { title: 'Property detail', subtitle: 'Hotel diagnosis' }
    return { title: 'ReviewOps' }
}

export function AppHeader() {
    const pathname = usePathname()
    const meta = getPageMeta(pathname)

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="size-9" />
            <Separator orientation="vertical" className="mr-1 h-6" />
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold tracking-tight">{meta.title}</h1>
                {meta.subtitle ? <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <SyncStatusIndicator />
                <ModeToggle />
            </div>
        </header>
    )
}
