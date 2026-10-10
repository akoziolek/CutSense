CREATE TABLE "pattern_favourites" (
	"pattern_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pattern_favourites_pattern_id_user_id_pk" PRIMARY KEY("pattern_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "pattern_favourites" ADD CONSTRAINT "pattern_favourites_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_favourites" ADD CONSTRAINT "pattern_favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" DROP COLUMN "is_favourite";