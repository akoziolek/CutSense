ALTER TABLE "algorithm_types" DROP CONSTRAINT "algorithm_types_name_unique";--> statement-breakpoint
ALTER TABLE "tags_for_fabrics" DROP CONSTRAINT "tags_for_fabrics_name_unique";--> statement-breakpoint
ALTER TABLE "tags_for_patterns" DROP CONSTRAINT "tags_for_patterns_name_unique";--> statement-breakpoint

ALTER TABLE "algorithm_types" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('pl', "name", 'en', "name");--> statement-breakpoint
ALTER TABLE "algorithm_types" ALTER COLUMN "description" SET DATA TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('pl', "description", 'en', "description") END;--> statement-breakpoint
ALTER TABLE "tags_for_fabrics" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('pl', "name", 'en', "name");--> statement-breakpoint
ALTER TABLE "tags_for_patterns" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('pl', "name", 'en', "name");--> statement-breakpoint

CREATE UNIQUE INDEX "tags_fabrics_name_pl_idx" ON "tags_for_fabrics" USING btree (lower("name"->>'pl'));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_fabrics_name_en_idx" ON "tags_for_fabrics" USING btree (lower("name"->>'en'));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_patterns_name_pl_idx" ON "tags_for_patterns" USING btree (lower("name"->>'pl'));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_patterns_name_en_idx" ON "tags_for_patterns" USING btree (lower("name"->>'en'));