CREATE INDEX "fabric_tags_tag_id_idx" ON "fabric_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "fabrics_user_id_idx" ON "fabrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fabrics_boundary_idx" ON "fabrics" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "optimization_results_pattern_id_idx" ON "optimization_results" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "optimization_results_algorithm_id_idx" ON "optimization_results" USING btree ("algorithm_id");--> statement-breakpoint
CREATE INDEX "optimization_results_custom_fabric_id_idx" ON "optimization_results" USING btree ("custom_fabric_id");--> statement-breakpoint
CREATE INDEX "pattern_favourites_user_id_idx" ON "pattern_favourites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pattern_pieces_pattern_id_idx" ON "pattern_pieces" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "pattern_pieces_boundary_idx" ON "pattern_pieces" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "pattern_stars_user_id_idx" ON "pattern_stars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pattern_tags_tag_id_idx" ON "pattern_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "patterns_user_id_idx" ON "patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "placed_pieces_pattern_piece_id_idx" ON "placed_pieces" USING btree ("pattern_piece_id");--> statement-breakpoint
CREATE INDEX "placed_pieces_optimization_result_id_idx" ON "placed_pieces" USING btree ("optimization_result_id");--> statement-breakpoint
CREATE INDEX "placed_pieces_placement_idx" ON "placed_pieces" USING gist ("placement");