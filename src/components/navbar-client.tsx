'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

const AUTH_ROUTES = ['/signin', '/signup', '/reset-password', '/goodbye']

export function NavbarClient() {
    const pathname = usePathname()

    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

    if (isAuthRoute) {
        return null
    }

    return <Navbar />
}
