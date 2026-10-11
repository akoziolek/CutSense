ALTER TABLE "fabric_tags" DROP CONSTRAINT "fabric_tags_fabric_id_fabrics_id_fk";
--> statement-breakpoint
ALTER TABLE "fabric_tags" DROP CONSTRAINT "fabric_tags_tag_id_tags_for_fabrics_id_fk";
--> statement-breakpoint
ALTER TABLE "fabrics" DROP CONSTRAINT "fabrics_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "optimization_results" DROP CONSTRAINT "optimization_results_pattern_id_patterns_id_fk";
--> statement-breakpoint
ALTER TABLE "optimization_results" DROP CONSTRAINT "optimization_results_algorithm_id_algorithm_types_id_fk";
--> statement-breakpoint
ALTER TABLE "optimization_results" DROP CONSTRAINT "optimization_results_custom_fabric_id_fabrics_id_fk";
--> statement-breakpoint
ALTER TABLE "pattern_pieces" DROP CONSTRAINT "pattern_pieces_pattern_id_patterns_id_fk";
--> statement-breakpoint
ALTER TABLE "pattern_stars" DROP CONSTRAINT "pattern_stars_pattern_id_patterns_id_fk";
--> statement-breakpoint
ALTER TABLE "pattern_stars" DROP CONSTRAINT "pattern_stars_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pattern_tags" DROP CONSTRAINT "pattern_tags_pattern_id_patterns_id_fk";
--> statement-breakpoint
ALTER TABLE "pattern_tags" DROP CONSTRAINT "pattern_tags_tag_id_tags_for_patterns_id_fk";
--> statement-breakpoint
ALTER TABLE "patterns" DROP CONSTRAINT "patterns_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "placed_pieces" DROP CONSTRAINT "placed_pieces_pattern_piece_id_pattern_pieces_id_fk";
--> statement-breakpoint
ALTER TABLE "placed_pieces" DROP CONSTRAINT "placed_pieces_optimization_result_id_optimization_results_id_fk";
--> statement-breakpoint
ALTER TABLE "fabric_tags" ADD CONSTRAINT "fabric_tags_fabric_id_fabrics_id_fk" FOREIGN KEY ("fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabric_tags" ADD CONSTRAINT "fabric_tags_tag_id_tags_for_fabrics_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags_for_fabrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fabrics" ADD CONSTRAINT "fabrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD CONSTRAINT "optimization_results_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD CONSTRAINT "optimization_results_algorithm_id_algorithm_types_id_fk" FOREIGN KEY ("algorithm_id") REFERENCES "public"."algorithm_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_results" ADD CONSTRAINT "optimization_results_custom_fabric_id_fabrics_id_fk" FOREIGN KEY ("custom_fabric_id") REFERENCES "public"."fabrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_pieces" ADD CONSTRAINT "pattern_pieces_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_stars" ADD CONSTRAINT "pattern_stars_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_stars" ADD CONSTRAINT "pattern_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_tags" ADD CONSTRAINT "pattern_tags_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_tags" ADD CONSTRAINT "pattern_tags_tag_id_tags_for_patterns_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags_for_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placed_pieces" ADD CONSTRAINT "placed_pieces_pattern_piece_id_pattern_pieces_id_fk" FOREIGN KEY ("pattern_piece_id") REFERENCES "public"."pattern_pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placed_pieces" ADD CONSTRAINT "placed_pieces_optimization_result_id_optimization_results_id_fk" FOREIGN KEY ("optimization_result_id") REFERENCES "public"."optimization_results"("id") ON DELETE cascade ON UPDATE no action;