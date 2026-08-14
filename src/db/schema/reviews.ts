import { index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
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

export const reviews = pgTable(
    'reviews',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        propertyId: uuid('property_id')
            .notNull()
            .references(() => properties.id, { onDelete: 'cascade' }),
        source: reviewSourceEnum('source').notNull().default('booking'),
        externalId: text('external_id'),
        fingerprint: text('fingerprint').notNull().unique(),
        rating: text('rating').notNull(),
        ratingNumeric: numeric('rating_numeric', { precision: 4, scale: 1 }).generatedAlwaysAs(sql`(rating::numeric)`),
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
    },
    (table) => [
        index('reviews_property_id_review_date_idx').on(table.propertyId, table.reviewDate.desc()),
        index('reviews_review_date_idx').on(table.reviewDate.desc()),
        index('reviews_property_rating_date_idx').on(table.propertyId, table.ratingNumeric, table.reviewDate.desc()),
    ],
)

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

export const reviewTopics = pgTable(
    'review_topics',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        reviewId: uuid('review_id')
            .notNull()
            .references(() => reviews.id, { onDelete: 'cascade' }),
        topic: reviewTopicEnum('topic').notNull(),
        sentiment: reviewSentimentEnum('sentiment').notNull(),
        confidence: text('confidence').notNull(),
        ...timestamps,
    },
    (table) => [
        index('review_topics_review_id_idx').on(table.reviewId),
        index('review_topics_topic_sentiment_review_id_idx').on(table.topic, table.sentiment, table.reviewId),
    ],
)

export type ReviewTopic = typeof reviewTopics.$inferSelect
export type NewReviewTopic = typeof reviewTopics.$inferInsert

export const scrapeRunStatusEnum = pgEnum('scrape_run_status', ['running', 'success', 'partial', 'failed', 'blocked'])

export const scrapeRuns = pgTable(
    'scrape_runs',
    {
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
    },
    (table) => [index('scrape_runs_property_started_idx').on(table.propertyId, table.startedAt.desc())],
)

export type ScrapeRun = typeof scrapeRuns.$inferSelect
export type NewScrapeRun = typeof scrapeRuns.$inferInsert

export const reviewInsights = pgTable('review_insights', {
    id: uuid('id').defaultRandom().primaryKey(),
    reviewId: uuid('review_id')
        .notNull()
        .unique()
        .references(() => reviews.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    strengths: jsonb('strengths').notNull().$type<string[]>(),
    issues: jsonb('issues').notNull().$type<string[]>(),
    suggestedAction: text('suggested_action').notNull(),
    model: text('model').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    ...timestamps,
})

export type ReviewInsight = typeof reviewInsights.$inferSelect
export type NewReviewInsight = typeof reviewInsights.$inferInsert
