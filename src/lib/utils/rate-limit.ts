import type { NextRequest } from 'next/server'

interface RateLimitConfig {
    windowMs: number
    maxRequests: number
    keyGenerator?: (request: NextRequest) => string
}

interface RequestInfo {
    count: number
    resetTime: number
}

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map<string, RequestInfo>()

export function createRateLimit(config: RateLimitConfig) {
    const { windowMs, maxRequests, keyGenerator = (req) => getClientIP(req) } = config

    return {
        check: (request: NextRequest): { success: boolean; limit: number; remaining: number; resetTime: number } => {
            const key = keyGenerator(request)
            const now = Date.now()
            // Clean up old entries
            cleanupExpiredEntries()

            const requestInfo = requestCounts.get(key)

            if (!requestInfo || requestInfo.resetTime <= now) {
                // First request or window expired
                const resetTime = now + windowMs
                requestCounts.set(key, { count: 1, resetTime })
                return {
                    success: true,
                    limit: maxRequests,
                    remaining: maxRequests - 1,
                    resetTime,
                }
            }

            if (requestInfo.count >= maxRequests) {
                // Rate limit exceeded
                return {
                    success: false,
                    limit: maxRequests,
                    remaining: 0,
                    resetTime: requestInfo.resetTime,
                }
            }

            // Increment counter
            requestInfo.count++
            requestCounts.set(key, requestInfo)

            return {
                success: true,
                limit: maxRequests,
                remaining: maxRequests - requestInfo.count,
                resetTime: requestInfo.resetTime,
            }
        },
    }
}

function getClientIP(request: NextRequest): string {
    // Try to get real IP from various headers
    const xForwardedFor = request.headers.get('x-forwarded-for')
    const xRealIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    if (xForwardedFor) {
        return xForwardedFor.split(',')[0]?.trim() ?? 'unknown'
    }

    if (xRealIP) {
        return xRealIP
    }

    if (cfConnectingIP) {
        return cfConnectingIP
    }

    return 'unknown'
}

function cleanupExpiredEntries() {
    const now = Date.now()
    for (const [key, requestInfo] of requestCounts.entries()) {
        if (requestInfo.resetTime <= now) {
            requestCounts.delete(key)
        }
    }
}

// Pre-configured rate limiters
export const authRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
})

export const apiRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
})
