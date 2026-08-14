import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampSyncHistoryLimit } from '@/lib/sync-history'

describe('clampSyncHistoryLimit', () => {
    it('defaults invalid values to 100', () => {
        assert.equal(clampSyncHistoryLimit(undefined), 100)
        assert.equal(clampSyncHistoryLimit(null), 100)
        assert.equal(clampSyncHistoryLimit(Number.NaN), 100)
    })

    it('caps values at 100 and floors at 1', () => {
        assert.equal(clampSyncHistoryLimit(500), 100)
        assert.equal(clampSyncHistoryLimit(0), 1)
        assert.equal(clampSyncHistoryLimit(-10), 1)
        assert.equal(clampSyncHistoryLimit(25.9), 25)
    })
})
