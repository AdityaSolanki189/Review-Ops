CREATE TYPE "public"."review_sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('booking');--> statement-breakpoint
CREATE TYPE "public"."review_topic" AS ENUM('cleanliness', 'noise', 'staff', 'check_in', 'location', 'facilities', 'value', 'wifi', 'food', 'comfort', 'bathroom', 'safety');--> statement-breakpoint
CREATE TYPE "public"."scrape_run_status" AS ENUM('running', 'success', 'partial', 'failed', 'blocked');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"booking_url" text NOT NULL,
	"booking_property_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "review_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"topic" "review_topic" NOT NULL,
	"sentiment" "review_sentiment" NOT NULL,
	"confidence" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"source" "review_source" DEFAULT 'booking' NOT NULL,
	"external_id" text,
	"fingerprint" text NOT NULL,
	"rating" text NOT NULL,
	"title" text,
	"positive_text" text,
	"negative_text" text,
	"review_date" timestamp with time zone NOT NULL,
	"stay_date" timestamp with time zone,
	"reviewer_name" text,
	"reviewer_country" text,
	"room_type" text,
	"traveller_type" text,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "scrape_run_status" DEFAULT 'running' NOT NULL,
	"reviews_found" text DEFAULT '0' NOT NULL,
	"reviews_inserted" text DEFAULT '0' NOT NULL,
	"reviews_updated" text DEFAULT '0' NOT NULL,
	"attempt_count" text DEFAULT '1' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_topics" ADD CONSTRAINT "review_topics_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;