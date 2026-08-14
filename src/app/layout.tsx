import type { Metadata } from 'next'
import { cn } from '@/lib/utils/utils'
import { config } from '@/lib/config/server'
import { Inter } from 'next/font/google'
// @ts-expect-error CSS import resolution issue
import '@/app/globals.css'
import TopLoader from '@/components/top-loader'
import Providers from '@/app/providers'
import { NavbarClient } from '@/components/navbar-client'
import { Footer } from '@/components/landing/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: {
        default: config.app.name,
        template: `%s | ${config.app.name}`,
    },
    description: config.app.description,
    keywords: ['Next.js', 'React', 'TypeScript', 'Authentication', 'Tailwind CSS'],
    authors: [{ name: 'Your Name' }],
    creator: 'Your Name',
    metadataBase: new URL(config.app.url),
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: config.app.url,
        title: config.app.name,
        description: config.app.description,
        siteName: config.app.name,
    },
    twitter: {
        card: 'summary_large_image',
        title: config.app.name,
        description: config.app.description,
        creator: '@yourusername', // Replace with actual Twitter handle
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <TopLoader />
            </head>
            <body className={cn(inter.className, 'min-h-screen antialiased')}>
                <Providers>
                    <NavbarClient />
                    {children}
                    <Footer />
                </Providers>
            </body>
        </html>
    )
}
