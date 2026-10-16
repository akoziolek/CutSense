ALTER TABLE "users" ADD COLUMN "google_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");