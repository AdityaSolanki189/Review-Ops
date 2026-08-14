'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Building2, RefreshCw, Star } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { clientConfig } from '@/lib/config/client'

const navItems: Array<{ href: Route; label: string; icon: typeof BarChart3 }> = [
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/reviews', label: 'Reviews', icon: Star },
    { href: '/properties', label: 'Properties', icon: Building2 },
    { href: '/sync', label: 'Sync', icon: RefreshCw },
]

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="font-semibold tracking-tight">
                            {clientConfig.app.name}
                        </Link>
                        <nav className="hidden items-center gap-1 md:flex">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                    <p className="hidden text-sm text-muted-foreground sm:block">Azzurro Hotels · Sydney</p>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    )
}
