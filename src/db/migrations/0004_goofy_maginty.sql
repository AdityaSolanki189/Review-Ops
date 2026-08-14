DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "reviews"
		WHERE "external_id" IS NOT NULL
		GROUP BY "source", "external_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION
			'Cannot add reviews_source_external_id_unique: duplicate (source, external_id) values exist. Resolve collisions before retrying.';
	END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_source_external_id_unique" ON "reviews" USING btree ("source","external_id") WHERE "reviews"."external_id" is not null;
