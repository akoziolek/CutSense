ALTER TABLE "pattern_pieces" ADD COLUMN "normal_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern_pieces" ADD COLUMN "mirrored_count" integer DEFAULT 0 NOT NULL;