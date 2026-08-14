ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "classifier_version" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "classified_at" timestamp with time zone;
