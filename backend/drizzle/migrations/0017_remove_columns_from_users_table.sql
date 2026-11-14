ALTER TABLE "users" ALTER COLUMN "nickname" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "surname";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "picture_url";