import type { Redis } from '@upstash/redis'
import { getRedis } from '@/lib/cache/redis'

export const CACHE_EPOCH_KEY = 'reviewops:epoch'
const KEY_PREFIX = 'reviewops:v1'

const DATE_FIELDS = new Set([
    'reviewDate',
    'stayDate',
    'scrapedAt',
    'startedAt',
    'finishedAt',
    'latestReviewAt',
    'newestReviewAt',
    'createdAt',
    'updatedAt',
])

/** Revive ISO date strings after JSON deserialization from Redis. */
export function reviveDates<T>(value: T): T {
    if (value === null || value === undefined) {
        return value
    }

    if (Array.isArray(value)) {
        return value.map((item) => reviveDates(item)) as T
    }

    if (typeof value === 'object') {
        const result: Record<string, unknown> = {}
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            if (DATE_FIELDS.has(key) && typeof nested === 'string') {
                result[key] = new Date(nested)
            } else {
                result[key] = reviveDates(nested)
            }
        }
        return result as T
    }

    return value
}

async function getCacheEpoch(redis: Redis): Promise<number> {
    const epoch = await redis.get<number>(CACHE_EPOCH_KEY)
    return epoch ?? 0
}

export async function buildCacheKey(redis: Redis, suffix: string): Promise<string> {
    const epoch = await getCacheEpoch(redis)
    return `${KEY_PREFIX}:${epoch}:${suffix}`
}

/** Cache-aside wrapper; falls through to loader when Redis is unavailable or errors. */
export async function cachedQuery<T>(suffix: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const redis = getRedis()
    if (!redis) {
        return loader()
    }

    try {
        const key = await buildCacheKey(redis, suffix)
        const hit = await redis.get<T>(key)
        if (hit !== null && hit !== undefined) {
            return reviveDates(hit)
        }

        const value = await loader()
        await redis.set(key, value, { ex: ttlSeconds })
        return value
    } catch (error) {
        console.error('[cache] Redis error, falling back to loader:', error)
        return loader()
    }
}

/** Bump cache epoch so new reads miss stale keys (old keys expire via TTL). */
export async function invalidateCache(): Promise<void> {
    const redis = getRedis()
    if (!redis) {
        return
    }

    try {
        await redis.incr(CACHE_EPOCH_KEY)
    } catch (error) {
        console.error('[cache] Failed to invalidate cache:', error)
    }
}
