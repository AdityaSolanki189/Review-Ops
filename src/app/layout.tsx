import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import Providers from '@/app/providers'
import { AppShell } from '@/components/layout/app-shell'
import TopLoader from '@/components/top-loader'
import { config } from '@/lib/config/server'
import { cn } from '@/lib/utils/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        default: config.app.name,
        template: `%s | ${config.app.name}`,
    },
    description: config.app.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <TopLoader />
            </head>
            <body className={cn(inter.className, 'min-h-screen antialiased')}>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    )
}
