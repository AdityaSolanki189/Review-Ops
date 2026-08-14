import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    ALL_TIME_FROM,
    buildAllTimeScope,
    buildCustomScope,
    buildScopePreset,
    formatCustomRangeLabel,
    isAllTimeScope,
    isCustomScope,
    isPresetScope,
    scopeComparisonLabel,
} from '@/lib/dashboard-scope'

const NOW = new Date('2025-06-15T02:00:00.000Z')

describe('dashboard scope period helpers', () => {
    it('buildAllTimeScope sets from ALL_TIME_FROM to today', () => {
        const base = buildScopePreset(
            { from: '2025-05-16', to: '2025-06-15', compare: 'previous-period', timezone: 'Australia/Sydney' },
            30,
            NOW,
        )
        const allTime = buildAllTimeScope(base, NOW)
        assert.equal(allTime.from, ALL_TIME_FROM)
        assert.equal(allTime.to, '2025-06-15')
        assert.equal(isAllTimeScope(allTime, NOW), true)
    })

    it('isPresetScope matches standard day presets ending today', () => {
        const scope30 = buildScopePreset(
            { from: 'x', to: 'x', compare: 'previous-period', timezone: 'Australia/Sydney' },
            30,
            NOW,
        )
        assert.equal(isPresetScope(scope30, NOW), true)
        assert.equal(isCustomScope(scope30, NOW), false)
    })

    it('isCustomScope matches non-preset explicit ranges', () => {
        const custom = buildCustomScope(
            { from: '2025-01-01', to: '2025-02-01', compare: 'previous-period', timezone: 'Australia/Sydney' },
            '2025-01-01',
            '2025-02-01',
        )
        assert.equal(isCustomScope(custom, NOW), true)
        assert.equal(isPresetScope(custom, NOW), false)
        assert.equal(isAllTimeScope(custom, NOW), false)
    })

    it('scopeComparisonLabel returns All time for all-time scope', () => {
        const allTime = buildAllTimeScope(
            { from: 'x', to: 'x', compare: 'previous-period', timezone: 'Australia/Sydney' },
            NOW,
        )
        assert.equal(scopeComparisonLabel(allTime, NOW), 'All time')
    })

    it('scopeComparisonLabel formats custom ranges with en-AU dates', () => {
        const custom = buildCustomScope(
            { from: 'x', to: 'x', compare: 'previous-period', timezone: 'Australia/Sydney' },
            '2025-01-01',
            '2025-02-01',
        )
        assert.equal(scopeComparisonLabel(custom, NOW), '1 Jan 2025 – 1 Feb 2025 vs previous period')
    })

    it('formatCustomRangeLabel shows compact range without comparison suffix', () => {
        const custom = buildCustomScope(
            { from: 'x', to: 'x', compare: 'previous-period', timezone: 'Australia/Sydney' },
            '2025-01-01',
            '2025-02-01',
        )
        assert.equal(formatCustomRangeLabel(custom), '1 Jan 2025 – 1 Feb 2025')
    })
})
