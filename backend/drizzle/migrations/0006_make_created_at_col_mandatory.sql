ALTER TABLE "fabric_tags" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "fabrics" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_results" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern_favourites" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern_pieces" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern_stars" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern_tags" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "patterns" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "placed_pieces" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags_for_fabrics" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags_for_patterns" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;