CREATE TABLE "optimization_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"saved_id" bigint,
	"saved_name" varchar(35),
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_saved_id_optimization_results_id_fk" FOREIGN KEY ("saved_id") REFERENCES "public"."optimization_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "optimization_runs_expires_at_idx" ON "optimization_runs" USING btree ("expires_at");