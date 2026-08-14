import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyReview } from '@/lib/classification/topics'

function hasTopic(
    matches: ReturnType<typeof classifyReview>,
    topic: string,
    sentiment?: 'positive' | 'negative' | 'neutral',
) {
    return matches.some((match) => match.topic === topic && (sentiment ? match.sentiment === sentiment : true))
}

describe('classifyReview', () => {
    it('does not match food topic when review says great', () => {
        const matches = classifyReview({
            rating: 9,
            positiveText: 'Great location and friendly staff.',
            negativeText: null,
        })
        assert.equal(hasTopic(matches, 'food'), false)
    })

    it('does not treat unsafe as positive safety mention', () => {
        const matches = classifyReview({
            rating: 4,
            positiveText: null,
            negativeText: 'The area felt unsafe at night.',
        })
        const safety = matches.find((match) => match.topic === 'safety')
        assert.ok(safety)
        assert.equal(safety.sentiment, 'negative')
    })

    it('handles negation for cleanliness', () => {
        const matches = classifyReview({
            rating: 7,
            positiveText: 'The room was not clean and smelled damp.',
            negativeText: null,
        })
        const cleanliness = matches.find((match) => match.topic === 'cleanliness')
        assert.ok(cleanliness)
        assert.equal(cleanliness.sentiment, 'negative')
    })

    it('detects mixed sentiment across topics in one review', () => {
        const matches = classifyReview({
            rating: 7,
            positiveText: 'Staff were wonderful and the location was perfect.',
            negativeText: 'However the bathroom was dirty and it was extremely noisy at night.',
        })
        assert.equal(hasTopic(matches, 'staff', 'positive'), true)
        assert.equal(hasTopic(matches, 'location', 'positive'), true)
        assert.equal(hasTopic(matches, 'bathroom', 'negative'), true)
        assert.equal(hasTopic(matches, 'noise', 'negative'), true)
    })

    it('does not match check_in on monkey', () => {
        const matches = classifyReview({
            rating: 8,
            positiveText: 'Saw a monkey near the window.',
            negativeText: null,
        })
        assert.equal(hasTopic(matches, 'check_in'), false)
    })

    it('classifies smell as its own topic', () => {
        const matches = classifyReview({
            rating: 5,
            negativeText: 'There was a strong damp smell in the corridor.',
        })
        assert.equal(hasTopic(matches, 'smell', 'negative'), true)
    })

    it('classifies air conditioning complaints', () => {
        const matches = classifyReview({
            rating: 4,
            negativeText: 'Air conditioning was broken and the room was boiling hot.',
        })
        assert.equal(hasTopic(matches, 'air_conditioning', 'negative'), true)
        assert.equal(hasTopic(matches, 'maintenance', 'negative'), true)
    })

    it('classifies late-night access code issues under check_in', () => {
        const matches = classifyReview({
            rating: 3,
            negativeText: 'Door code was not sent and we could not enter after midnight.',
        })
        assert.equal(hasTopic(matches, 'check_in', 'negative'), true)
    })

    it('classifies housekeeping linen issues', () => {
        const matches = classifyReview({
            rating: 5,
            negativeText: 'Sheets were not changed and towels were missing.',
        })
        assert.equal(hasTopic(matches, 'housekeeping', 'negative'), true)
    })

    it('classifies pest complaints', () => {
        const matches = classifyReview({
            rating: 2,
            negativeText: 'Cockroaches in the bathroom.',
        })
        assert.equal(hasTopic(matches, 'pests', 'negative'), true)
        assert.equal(hasTopic(matches, 'bathroom', 'negative'), true)
    })

    it('classifies booking payment disputes', () => {
        const matches = classifyReview({
            rating: 4,
            negativeText: 'Deposit was charged twice and refund was delayed.',
        })
        assert.equal(hasTopic(matches, 'booking_payment', 'negative'), true)
    })

    it('classifies accessibility concerns', () => {
        const matches = classifyReview({
            rating: 6,
            negativeText: 'No lift and many stairs for wheelchair users.',
        })
        assert.equal(hasTopic(matches, 'accessibility', 'negative'), true)
    })

    it('classifies room condition damage separately from maintenance', () => {
        const matches = classifyReview({
            rating: 5,
            negativeText: 'Peeling paint on walls and damaged furniture.',
        })
        assert.equal(hasTopic(matches, 'room_condition', 'negative'), true)
    })

    it('uses field and rating context for ambiguous location mentions', () => {
        const withoutCue = classifyReview({
            rating: 4,
            positiveText: null,
            negativeText: 'It was overpriced for what you get.',
        })
        const highRated = classifyReview({
            rating: 9,
            positiveText: 'Excellent location near the station.',
            negativeText: null,
        })
        assert.equal(hasTopic(withoutCue, 'location'), false)
        assert.equal(hasTopic(highRated, 'location', 'positive'), true)
    })

    it('returns empty array when no cues match', () => {
        const matches = classifyReview({
            rating: 8,
            positiveText: 'Lovely stay overall.',
            negativeText: null,
        })
        assert.equal(matches.length, 0)
    })
})

describe('isReclassificationEligible', () => {
    it('marks outdated classifier versions as eligible', async () => {
        const { isReclassificationEligible } = await import('@/lib/reclassification')
        assert.equal(isReclassificationEligible(3, 1), true)
        assert.equal(isReclassificationEligible(0, null), true)
        assert.equal(isReclassificationEligible(3, 2), false)
    })
})
