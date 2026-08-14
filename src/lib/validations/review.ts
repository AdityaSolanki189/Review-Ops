import { z } from 'zod'

export const scrapedReviewSchema = z.object({
    externalId: z.string().optional(),
    reviewerName: z.string().optional(),
    reviewerCountry: z.string().optional(),
    rating: z.number().min(1).max(10),
    title: z.string().optional(),
    positiveText: z.string().optional(),
    negativeText: z.string().optional(),
    reviewDate: z.date(),
    stayDate: z.date().optional(),
    roomType: z.string().optional(),
    travellerType: z.string().optional(),
})

export type ScrapedReview = z.infer<typeof scrapedReviewSchema>
