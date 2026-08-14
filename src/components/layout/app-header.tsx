'use client'

import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/components/layout/mode-toggle'
import { SyncStatusIndicator } from '@/components/layout/sync-status-indicator'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const pageTitles: Record<string, string> = {
    '/': 'Operations Dashboard',
    '/reviews': 'Reviews',
    '/properties': 'Properties',
    '/sync': 'Sync status',
}

function getPageTitle(pathname: string): string {
    if (pageTitles[pathname]) return pageTitles[pathname]
    if (pathname.startsWith('/properties/')) return 'Property detail'
    return 'ReviewOps'
}

export function AppHeader() {
    const pathname = usePathname()
    const title = getPageTitle(pathname)

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="size-9" />
            <Separator orientation="vertical" className="mr-1 h-6" />
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">{title}</h1>
            <div className="flex shrink-0 items-center gap-2">
                <SyncStatusIndicator />
                <ModeToggle />
            </div>
        </header>
    )
}
