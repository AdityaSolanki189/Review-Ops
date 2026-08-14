ALTER TABLE "properties" ADD COLUMN "latest_review_at" timestamp with time zone;
ALTER TABLE "scrape_runs" ADD COLUMN "newest_review_at" timestamp with time zone;
