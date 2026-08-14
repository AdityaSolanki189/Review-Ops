import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from '@/db/columns.helpers'

export const properties = pgTable('properties', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    bookingUrl: text('booking_url').notNull(),
    bookingPropertyId: text('booking_property_id').notNull(),
    latestReviewAt: timestamp('latest_review_at', { withTimezone: true, mode: 'date' }),
    backfillSkip: text('backfill_skip').notNull().default('0'),
    ...timestamps,
})

export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert

export const reviewSourceEnum = pgEnum('review_source', ['booking'])

export const reviews = pgTable('reviews', {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    source: reviewSourceEnum('source').notNull().default('booking'),
    externalId: text('external_id'),
    fingerprint: text('fingerprint').notNull().unique(),
    rating: text('rating').notNull(),
    title: text('title'),
    positiveText: text('positive_text'),
    negativeText: text('negative_text'),
    reviewDate: timestamp('review_date', { withTimezone: true, mode: 'date' }).notNull(),
    stayDate: timestamp('stay_date', { withTimezone: true, mode: 'date' }),
    reviewerName: text('reviewer_name'),
    reviewerCountry: text('reviewer_country'),
    roomType: text('room_type'),
    travellerType: text('traveller_type'),
    scrapedAt: timestamp('scraped_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    ...timestamps,
})

export type Review = typeof reviews.$inferSelect
export type NewReview = typeof reviews.$inferInsert

export const reviewTopicEnum = pgEnum('review_topic', [
    'cleanliness',
    'noise',
    'staff',
    'check_in',
    'location',
    'facilities',
    'value',
    'wifi',
    'food',
    'comfort',
    'bathroom',
    'safety',
])

export const reviewSentimentEnum = pgEnum('review_sentiment', ['positive', 'negative', 'neutral'])

export const reviewTopics = pgTable('review_topics', {
    id: uuid('id').defaultRandom().primaryKey(),
    reviewId: uuid('review_id')
        .notNull()
        .references(() => reviews.id, { onDelete: 'cascade' }),
    topic: reviewTopicEnum('topic').notNull(),
    sentiment: reviewSentimentEnum('sentiment').notNull(),
    confidence: text('confidence').notNull(),
    ...timestamps,
})

export type ReviewTopic = typeof reviewTopics.$inferSelect
export type NewReviewTopic = typeof reviewTopics.$inferInsert

export const scrapeRunStatusEnum = pgEnum('scrape_run_status', ['running', 'success', 'partial', 'failed', 'blocked'])

export const scrapeRuns = pgTable('scrape_runs', {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id')
        .notNull()
        .references(() => properties.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
    status: scrapeRunStatusEnum('status').notNull().default('running'),
    reviewsFound: text('reviews_found').notNull().default('0'),
    reviewsInserted: text('reviews_inserted').notNull().default('0'),
    reviewsUpdated: text('reviews_updated').notNull().default('0'),
    attemptCount: text('attempt_count').notNull().default('1'),
    errorMessage: text('error_message'),
    newestReviewAt: timestamp('newest_review_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
})

export type ScrapeRun = typeof scrapeRuns.$inferSelect
export type NewScrapeRun = typeof scrapeRuns.$inferInsert
