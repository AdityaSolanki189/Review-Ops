import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { estimateTotalPages, shouldStopAfterPage, setPaginationInBody } from '../graphql'
import { parseGraphqlReviewCard } from '../parser'
import type { GraphqlReviewCard } from '../graphql'
import { computeResumeSkip } from '../watermark'
import { SCRAPE_CONFIG } from '../selectors'

const mackenzieCard: GraphqlReviewCard = {
    reviewScore: 8.0,
    reviewUrl: 'a5698a52935ac7f7',
    reviewedDate: 1785032296,
    guestDetails: {
        username: 'Mackenzie',
        countryName: 'Australia',
        guestTypeTranslation: 'Solo traveller',
    },
    textDetails: {
        title: null,
        positiveText:
            'The check in process was quick and easy, and the staff were responsive and super helpful. The room was tidy, spacious and comfortable. Alona and the team were a great help and made my stay very comfortable.',
        negativeText: null,
    },
    bookingDetails: {
        checkinDate: '2026-07-24',
        roomType: {
            name: 'Budget Large Double Room (Ensuite)',
        },
    },
}

const kumarCard: GraphqlReviewCard = {
    reviewScore: 8.0,
    reviewUrl: '86d1c9f4515df5e5',
    reviewedDate: 1786658076,
    guestDetails: {
        username: 'Kumar',
        countryName: 'Australia',
        guestTypeTranslation: 'Solo traveller',
    },
    textDetails: {
        title: null,
        positiveText: null,
        negativeText: 'No kitchen utensils or microwave',
    },
    bookingDetails: {
        checkinDate: '2026-08-11',
        roomType: {
            name: 'Budget Double Room (Shared Bathroom)',
        },
    },
}

const stopDefaults = {
    consecutiveKnown: 0,
    consecutiveKnownStop: 8,
    skip: 0,
    reviewsCount: 24,
    pageSize: 10,
    pageNumber: 1,
    maxPagesSafety: SCRAPE_CONFIG.maxPagesSafety,
}

describe('parseGraphqlReviewCard', () => {
    it('maps Mackenzie review with unix timestamp and stay date', () => {
        const review = parseGraphqlReviewCard(mackenzieCard)
        assert.ok(review)
        assert.equal(review.externalId, 'a5698a52935ac7f7')
        assert.equal(review.rating, 8)
        assert.equal(review.reviewerName, 'Mackenzie')
        assert.equal(review.reviewerCountry, 'Australia')
        assert.equal(review.roomType, 'Budget Large Double Room (Ensuite)')
        assert.equal(review.travellerType, 'Solo traveller')
        assert.equal(review.reviewDate.toISOString(), new Date(1785032296 * 1000).toISOString())
        assert.equal(review.stayDate?.toISOString(), '2026-07-24T00:00:00.000Z')
    })

    it('maps Kumar negative-only review', () => {
        const review = parseGraphqlReviewCard(kumarCard)
        assert.ok(review)
        assert.equal(review.externalId, '86d1c9f4515df5e5')
        assert.equal(review.negativeText, 'No kitchen utensils or microwave')
        assert.equal(review.positiveText, undefined)
    })
})

describe('computeResumeSkip', () => {
    it('returns stored skip in backfill mode when set', () => {
        assert.equal(computeResumeSkip(500, 487, 10, true), 500)
    })

    it('derives skip from db count when stored skip is zero', () => {
        assert.equal(computeResumeSkip(0, 487, 10, true), 480)
    })

    it('returns zero in incremental mode', () => {
        assert.equal(computeResumeSkip(500, 487, 10, false), 0)
    })
})

describe('shouldStopAfterPage', () => {
    it('stops when newest card is at or before watermark in incremental mode', () => {
        const review = parseGraphqlReviewCard(mackenzieCard)
        assert.ok(review)

        const decision = shouldStopAfterPage({
            reviews: [review],
            watermark: review.reviewDate,
            backfillMode: false,
            ...stopDefaults,
        })

        assert.equal(decision.stop, true)
        assert.equal(decision.reason, 'watermark')
    })

    it('continues past watermark in backfill mode', () => {
        const review = parseGraphqlReviewCard(mackenzieCard)
        assert.ok(review)

        const decision = shouldStopAfterPage({
            reviews: [review],
            watermark: review.reviewDate,
            backfillMode: true,
            consecutiveKnown: 0,
            consecutiveKnownStop: 8,
            skip: 480,
            reviewsCount: 2526,
            pageSize: 10,
            pageNumber: 49,
            maxPagesSafety: SCRAPE_CONFIG.maxPagesSafety,
        })

        assert.equal(decision.stop, false)
    })

    it('continues when reviews are newer than watermark', () => {
        const review = parseGraphqlReviewCard(mackenzieCard)
        assert.ok(review)

        const decision = shouldStopAfterPage({
            reviews: [review],
            watermark: new Date(review.reviewDate.getTime() - 86_400_000),
            backfillMode: false,
            ...stopDefaults,
        })

        assert.equal(decision.stop, false)
    })

    it('stops at end of list in backfill mode', () => {
        const review = parseGraphqlReviewCard(mackenzieCard)
        assert.ok(review)

        const decision = shouldStopAfterPage({
            reviews: [review],
            watermark: null,
            backfillMode: true,
            skip: 20,
            reviewsCount: 24,
            pageSize: 10,
            pageNumber: 3,
            consecutiveKnown: 0,
            consecutiveKnownStop: 8,
            maxPagesSafety: SCRAPE_CONFIG.maxPagesSafety,
        })

        assert.equal(decision.stop, true)
        assert.equal(decision.reason, 'end_of_list')
    })
})

describe('estimateTotalPages', () => {
    it('computes pages from reviewsCount and page size', () => {
        assert.equal(estimateTotalPages(4258, 25), 171)
        assert.equal(estimateTotalPages(24, 10), 3)
    })
})

describe('setPaginationInBody', () => {
    it('updates skip, sorter, and limit fields in nested GraphQL variables', () => {
        const body = JSON.stringify({
            operationName: 'ReviewList',
            variables: {
                input: {
                    skip: 0,
                    limit: 10,
                    sorter: 'MOST_RELEVANT',
                },
            },
        })

        const updated = JSON.parse(setPaginationInBody(body, 20, 'NEWEST_FIRST', 25)) as {
            variables: { input: { skip: number; sorter: string; limit: number } }
        }

        assert.equal(updated.variables.input.skip, 20)
        assert.equal(updated.variables.input.sorter, 'NEWEST_FIRST')
        assert.equal(updated.variables.input.limit, 25)
    })
})
