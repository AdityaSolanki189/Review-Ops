CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" text NOT NULL,
	"input_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_embeddings_review_id_unique" UNIQUE("review_id")
);--> statement-breakpoint
ALTER TABLE "review_embeddings" ADD CONSTRAINT "review_embeddings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_embeddings_review_id_idx" ON "review_embeddings" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_embeddings_embedding_hnsw_idx" ON "review_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
