'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Building2, ChevronsRight, RefreshCw, Star } from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar'
import { clientConfig } from '@/lib/config/client'
import { useSyncHealthQuery } from '@/lib/queries/dashboard.queries'

const navButtonClassName =
    'group-data-[collapsible=icon]:!size-12 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center'

const navItems: Array<{ href: Route; label: string; icon: typeof BarChart3 }> = [
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/reviews', label: 'Reviews', icon: Star },
    { href: '/properties', label: 'Properties', icon: Building2 },
    { href: '/sync', label: 'Sync', icon: RefreshCw },
]

function SidebarCollapseToggle() {
    const { state, toggleSidebar } = useSidebar()
    const expanded = state === 'expanded'

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-12 min-h-12 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
            <span className="flex size-8 shrink-0 items-center justify-center">
                <ChevronsRight
                    className={`size-4 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </span>
            <span className="truncate group-data-[collapsible=icon]:hidden">{expanded ? 'Hide' : 'Show'}</span>
        </button>
    )
}

export function AppSidebar() {
    const pathname = usePathname()
    const { data: syncHealth } = useSyncHealthQuery()

    const syncIssueCount =
        syncHealth?.latestRuns.filter((entry) => entry.run?.status === 'blocked' || entry.run?.status === 'failed')
            .length ?? 0

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex h-16 shrink-0 justify-center border-b border-sidebar-border px-2 py-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            tooltip={clientConfig.app.name}
                            className={`${navButtonClassName} group-data-[collapsible=icon]:mx-auto`}
                        >
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <BarChart3 className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{clientConfig.app.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">Azzurro Hotels</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Operations</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                                const showSyncBadge = item.href === '/sync' && syncIssueCount > 0
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={item.label}
                                            size="lg"
                                            className={navButtonClassName}
                                        >
                                            <Link href={item.href}>
                                                <Icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        {showSyncBadge ? (
                                            <SidebarMenuBadge className="bg-destructive text-destructive-foreground group-data-[collapsible=icon]:hidden">
                                                {syncIssueCount}
                                            </SidebarMenuBadge>
                                        ) : null}
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarCollapseToggle />
                <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Sydney properties
                </p>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
