import { Redis } from '@upstash/redis'

let _redis: Redis | null | undefined

/** Lazy Redis client; returns null when Upstash env vars are not configured. */
export function getRedis(): Redis | null {
    if (_redis !== undefined) {
        return _redis
    }

    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        _redis = null
        return null
    }

    _redis = new Redis({ url, token })
    return _redis
}

/** Reset client (for tests). */
export function resetRedisClient(): void {
    _redis = undefined
}

/** Inject a Redis client (for tests). */
export function setRedisForTests(client: Redis | null): void {
    _redis = client
}
