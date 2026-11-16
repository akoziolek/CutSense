CREATE INDEX "fabrics_user_created_idx" ON "fabrics" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "optimization_user_created_idx" ON "optimization_results" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pattern_user_created_idx" ON "patterns" USING btree ("user_id","created_at");