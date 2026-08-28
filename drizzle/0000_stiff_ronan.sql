CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"option" text NOT NULL,
	"voter_id" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "votes_slug_voter_idx" ON "votes" USING btree ("slug","voter_id");--> statement-breakpoint
CREATE INDEX "votes_slug_option_idx" ON "votes" USING btree ("slug","option");--> statement-breakpoint
CREATE INDEX "votes_ip_recent_idx" ON "votes" USING btree ("ip_hash","updated_at");