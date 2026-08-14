import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Mirrors Next.js proxy best practices: https://nextjs.org/docs/app/building-your-application/routing/proxy#advanced-routing
const STATIC_PATH_PREFIXES = ['/_next', '/icons', '/images']
const PUBLIC_FILE_EXTENSIONS = /\.(?:ico|png|jpg|jpeg|gif|svg|txt|xml|webmanifest)$/
const PUBLIC_FILE_PATHS = new Set(['/favicon.ico', '/manifest.json', '/robots.txt'])

const PUBLIC_ROUTES = new Set(['/'])
const AUTH_ROUTES = new Set(['/signin', '/signup', '/reset-password', '/goodbye'])

const isAuthRoute = (pathname: string) => AUTH_ROUTES.has(pathname)
const isPublicRoute = (pathname: string) => PUBLIC_ROUTES.has(pathname)
const isHiddenProtectedRoute = (pathname: string) => pathname === '/profile' || pathname.startsWith('/profile/')
const isStaticAsset = (pathname: string) =>
    STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE_PATHS.has(pathname) ||
    PUBLIC_FILE_EXTENSIONS.test(pathname)

const buildRedirect = (request: NextRequest, pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    return NextResponse.redirect(url)
}

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (isStaticAsset(pathname)) {
        return NextResponse.next()
    }

    const sessionCookie = getSessionCookie(request)

    if (sessionCookie && isAuthRoute(pathname)) {
        return buildRedirect(request, '/profile')
    }

    if (!sessionCookie && !isAuthRoute(pathname) && !isPublicRoute(pathname) && !isHiddenProtectedRoute(pathname)) {
        return buildRedirect(request, '/signin')
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image).*)'],
}
