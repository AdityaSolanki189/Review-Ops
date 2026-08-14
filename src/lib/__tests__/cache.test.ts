import assert from 'node:assert/strict'
import { describe, it, afterEach } from 'node:test'
import { CACHE_EPOCH_KEY, buildCacheKey, cachedQuery, invalidateCache, reviveDates } from '@/lib/cache/cached'
import { resetRedisClient, setRedisForTests } from '@/lib/cache/redis'

type FakeRedisStore = Map<string, unknown>

class FakeRedis {
    store: FakeRedisStore = new Map()

    async get<T>(key: string): Promise<T | null> {
        const value = this.store.get(key)
        return value === undefined ? null : (value as T)
    }

    async set(key: string, value: unknown, _opts?: { ex?: number }): Promise<'OK'> {
        this.store.set(key, value)
        return 'OK'
    }

    async incr(key: string): Promise<number> {
        const current = Number(this.store.get(key) ?? 0)
        const next = current + 1
        this.store.set(key, next)
        return next
    }
}

describe('reviveDates', () => {
    it('converts known date fields from ISO strings to Date objects', () => {
        const input = {
            reviewDate: '2025-01-15T00:00:00.000Z',
            nested: {
                finishedAt: '2025-02-01T12:00:00.000Z',
            },
            title: 'Great stay',
        }

        const result = reviveDates(input) as unknown as {
            reviewDate: Date
            nested: { finishedAt: Date }
            title: string
        }

        assert.ok(result.reviewDate instanceof Date)
        assert.ok(result.nested.finishedAt instanceof Date)
        assert.equal(result.title, 'Great stay')
    })
})

describe('cachedQuery', () => {
    const fake = new FakeRedis()

    afterEach(() => {
        fake.store.clear()
        resetRedisClient()
        setRedisForTests(null)
    })

    it('returns loader result when Redis is not configured', async () => {
        let calls = 0
        const value = await cachedQuery('no-redis', 60, async () => {
            calls += 1
            return { ok: true }
        })

        assert.deepEqual(value, { ok: true })
        assert.equal(calls, 1)
    })

    it('caches loader results on hit', async () => {
        setRedisForTests(fake as never)

        let calls = 0
        const loader = async () => {
            calls += 1
            return { count: calls }
        }

        const first = await cachedQuery('metrics', 60, loader)
        const second = await cachedQuery('metrics', 60, loader)

        assert.deepEqual(first, { count: 1 })
        assert.deepEqual(second, { count: 1 })
        assert.equal(calls, 1)
    })

    it('misses cache after epoch invalidation', async () => {
        setRedisForTests(fake as never)

        let calls = 0
        const loader = async () => {
            calls += 1
            return calls
        }

        assert.equal(await cachedQuery('sync:latest', 60, loader), 1)
        assert.equal(await cachedQuery('sync:latest', 60, loader), 1)

        await invalidateCache()
        assert.equal(await cachedQuery('sync:latest', 60, loader), 2)
        assert.equal(calls, 2)
    })

    it('falls back to loader when Redis throws', async () => {
        const broken = {
            async get() {
                throw new Error('connection failed')
            },
            async set() {
                throw new Error('connection failed')
            },
            async incr() {
                throw new Error('connection failed')
            },
        }

        setRedisForTests(broken as never)

        let calls = 0
        const value = await cachedQuery('fallback', 60, async () => {
            calls += 1
            return 'postgres'
        })

        assert.equal(value, 'postgres')
        assert.equal(calls, 1)
    })

    it('builds versioned keys with current epoch', async () => {
        setRedisForTests(fake as never)

        const key = await buildCacheKey(fake as never, 'properties')
        assert.equal(key, 'reviewops:v1:0:properties')

        await fake.incr(CACHE_EPOCH_KEY)
        const nextKey = await buildCacheKey(fake as never, 'properties')
        assert.equal(nextKey, 'reviewops:v1:1:properties')
    })
})
