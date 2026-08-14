import type { Page } from 'playwright'
import { scrapedReviewSchema, type ScrapedReview } from '@/lib/validations/review'
import type { GraphqlReviewCard } from './graphql'
import { parseRating, parseReviewDate, parseStayDate, parseUnixReviewDate, normalizeText } from './normalize'
import { selectors } from './selectors'

export interface RawReviewCard {
    externalId?: string
    reviewerName?: string
    reviewerCountry?: string
    ratingRaw?: string
    title?: string
    positiveText?: string
    negativeText?: string
    reviewDateRaw?: string
    stayDateRaw?: string
    roomType?: string
    travellerType?: string
}

export async function extractReviewCards(page: Page): Promise<RawReviewCard[]> {
    return page.evaluate((selectorConfig) => {
        const cards = Array.from(document.querySelectorAll(selectorConfig.reviewCard))

        return cards.map((card, index) => {
            const element = card as HTMLElement
            const getText = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? undefined

            const externalId =
                element.getAttribute('data-review-id') ??
                element.querySelector('[data-review-id]')?.getAttribute('data-review-id') ??
                `idx-${index}`

            return {
                externalId,
                reviewerName: getText(selectorConfig.reviewerName),
                reviewerCountry: getText(selectorConfig.reviewerCountry),
                ratingRaw: getText(selectorConfig.reviewRating),
                title: getText(selectorConfig.reviewTitle),
                positiveText: getText(selectorConfig.reviewPositive),
                negativeText: getText(selectorConfig.reviewNegative),
                reviewDateRaw: getText(selectorConfig.reviewDate),
                stayDateRaw: getText(selectorConfig.roomType),
                roomType: getText(selectorConfig.roomType),
                travellerType: getText(selectorConfig.travellerType),
            }
        })
    }, selectors)
}

export function parseReviewCard(raw: RawReviewCard): ScrapedReview | null {
    const rating = parseRating(raw.ratingRaw)
    const reviewDate = parseReviewDate(raw.reviewDateRaw)

    if (rating === null || reviewDate === null) {
        return null
    }

    const candidate = {
        externalId: raw.externalId,
        reviewerName: normalizeText(raw.reviewerName),
        reviewerCountry: normalizeText(raw.reviewerCountry),
        rating,
        title: normalizeText(raw.title),
        positiveText: normalizeText(raw.positiveText),
        negativeText: normalizeText(raw.negativeText),
        reviewDate,
        stayDate: parseStayDate(raw.stayDateRaw),
        roomType: normalizeText(raw.roomType),
        travellerType: normalizeText(raw.travellerType),
    }

    const parsed = scrapedReviewSchema.safeParse(candidate)
    return parsed.success ? parsed.data : null
}

export function parseReviewCards(rawCards: RawReviewCard[]): ScrapedReview[] {
    return rawCards.map(parseReviewCard).filter((review): review is ScrapedReview => review !== null)
}

export function parseGraphqlReviewCard(raw: GraphqlReviewCard): ScrapedReview | null {
    const rating = raw.reviewScore ?? null
    const reviewDate = parseUnixReviewDate(raw.reviewedDate)

    if (rating === null || reviewDate === null) {
        return null
    }

    if (rating < 1 || rating > 10) {
        return null
    }

    const candidate = {
        externalId: normalizeText(raw.reviewUrl),
        reviewerName: normalizeText(raw.guestDetails?.username ?? undefined),
        reviewerCountry: normalizeText(raw.guestDetails?.countryName ?? undefined),
        rating,
        title: normalizeText(raw.textDetails?.title ?? undefined),
        positiveText: normalizeText(raw.textDetails?.positiveText ?? undefined),
        negativeText: normalizeText(raw.textDetails?.negativeText ?? undefined),
        reviewDate,
        stayDate: parseStayDate(raw.bookingDetails?.checkinDate ?? undefined),
        roomType: normalizeText(raw.bookingDetails?.roomType?.name ?? undefined),
        travellerType: normalizeText(raw.guestDetails?.guestTypeTranslation ?? undefined),
    }

    const parsed = scrapedReviewSchema.safeParse(candidate)
    return parsed.success ? parsed.data : null
}

export function parseGraphqlReviewCards(rawCards: GraphqlReviewCard[]): ScrapedReview[] {
    return rawCards.map(parseGraphqlReviewCard).filter((review): review is ScrapedReview => review !== null)
}
