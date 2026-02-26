CREATE TABLE "posts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_markdown" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at_source" timestamp with time zone,
	"author" text,
	"featured" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reading_time_text" text,
	"reading_time_minutes" real,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_unique_index" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_published_at_id_desc_index" ON "posts" USING btree ("published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_updated_at_id_index" ON "posts" USING btree ("updated_at","id");