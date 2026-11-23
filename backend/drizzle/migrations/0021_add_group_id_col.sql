ALTER TABLE "optimization_results" ADD COLUMN "group_id" uuid;--> statement-breakpoint
CREATE INDEX "optimization_results_group_id_idx" ON "optimization_results" USING btree ("group_id");