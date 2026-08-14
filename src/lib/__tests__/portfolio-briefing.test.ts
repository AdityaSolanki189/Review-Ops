import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildDeterministicBriefingForTest } from '@/lib/ai/weekly-briefing.test-utils'

describe('portfolio briefing', () => {
    it('returns deterministic briefing shape without AI', () => {
        const result = buildDeterministicBriefingForTest()

        assert.equal(result.available, true)
        if (!result.available) return
        assert.ok(result.summary.length > 0)
        assert.ok(Array.isArray(result.actions))
        assert.ok(result.actions.length <= 3)
        assert.equal(result.source, 'deterministic')
    })

    it('returns unavailable message when there are no reviews', () => {
        const result = buildDeterministicBriefingForTest({ reviewCount: 0 })

        assert.equal(result.available, false)
        if (result.available) return
        assert.match(result.message, /No reviews/)
    })
})
