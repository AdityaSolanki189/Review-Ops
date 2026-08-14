import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    calculateTopicSharePercentage,
    formatNegativeTopicInsight,
    getSydneyWeekBounds,
    getSydneyWeekdayIndex,
} from '@/lib/weekly-snapshot'
import { sydneyDateStartToUtc } from '@/lib/analytics'

describe('weekly snapshot helpers', () => {
    it('treats Thursday 14 Aug 2025 Sydney as weekday index 4', () => {
        const index = getSydneyWeekdayIndex(sydneyDateStartToUtc('2025-08-14'))
        assert.equal(index, 4)
    })

    it('finds Monday 11 Aug 2025 as the Sydney week start for 14 Aug 2025', () => {
        const bounds = getSydneyWeekBounds(new Date('2025-08-14T12:00:00.000Z'))
        assert.equal(bounds.weekStart, '2025-08-11')
        assert.equal(bounds.weekEnd, '2025-08-17')
        assert.equal(bounds.previousWeekStart, '2025-08-04')
        assert.equal(bounds.previousWeekEnd, '2025-08-10')
    })

    it('calculates negative topic share percentages', () => {
        assert.equal(calculateTopicSharePercentage(4, 10), 40)
        assert.equal(calculateTopicSharePercentage(0, 0), null)
    })

    it('formats the brief-style negative insight sentence', () => {
        assert.equal(
            formatNegativeTopicInsight('Cleanliness', 40),
            '40% of negative reviews this week mentioned Cleanliness.',
        )
    })
})
