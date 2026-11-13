ALTER TABLE "optimization_results" ADD COLUMN "user_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "min_length_mm" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "spent_time" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "usable_scraps_area" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "usable_scraps_percentage" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "waste_scraps_area" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "waste_scraps_percentage" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "remaining_fabric_area" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD COLUMN "remaining_area_percentage" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD CONSTRAINT "optimization_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "optimization_results_user_id_idx" ON "optimization_results" USING btree ("user_id");