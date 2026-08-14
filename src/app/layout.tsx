import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import '@/app/globals.css'
import Providers from '@/app/providers'
import { AppShell } from '@/components/layout/app-shell'
import TopLoader from '@/components/top-loader'
import { config } from '@/lib/config/server'
import { cn } from '@/lib/utils/utils'

export const metadata: Metadata = {
    title: {
        default: config.app.name,
        template: `%s | ${config.app.name}`,
    },
    description: config.app.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={cn(GeistSans.variable, GeistMono.variable)}>
            <head>
                <TopLoader />
            </head>
            <body className="min-h-screen font-sans antialiased">
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    )
}
