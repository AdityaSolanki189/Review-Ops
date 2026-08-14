ALTER TABLE "reviews" ADD COLUMN "rating_numeric" numeric(4, 1) GENERATED ALWAYS AS ((rating::numeric)) STORED;--> statement-breakpoint
CREATE INDEX "reviews_property_id_review_date_idx" ON "reviews" USING btree ("property_id","review_date" DESC);--> statement-breakpoint
CREATE INDEX "reviews_review_date_idx" ON "reviews" USING btree ("review_date" DESC);--> statement-breakpoint
CREATE INDEX "reviews_property_rating_date_idx" ON "reviews" USING btree ("property_id","rating_numeric","review_date" DESC);--> statement-breakpoint
CREATE INDEX "review_topics_review_id_idx" ON "review_topics" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_topics_topic_sentiment_review_id_idx" ON "review_topics" USING btree ("topic","sentiment","review_id");--> statement-breakpoint
CREATE INDEX "scrape_runs_property_started_idx" ON "scrape_runs" USING btree ("property_id","started_at" DESC);--> statement-breakpoint
CREATE TABLE "review_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"issues" jsonb NOT NULL,
	"suggested_action" text NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_insights_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
ALTER TABLE "review_insights" ADD CONSTRAINT "review_insights_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
