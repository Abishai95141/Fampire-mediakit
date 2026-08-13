import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_entry_query_filters_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  CREATE TYPE "public"."enum_pages_blocks_search_bar_scope_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_filters_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  CREATE TYPE "public"."enum__pages_v_blocks_search_bar_scope_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  ALTER TYPE "public"."enum_pages_blocks_stats_stats_source" ADD VALUE 'filmRecordCount' BEFORE 'awardTotal';
  ALTER TYPE "public"."enum__pages_v_blocks_stats_stats_source" ADD VALUE 'filmRecordCount' BEFORE 'awardTotal';
  CREATE TABLE "pages_blocks_entry_query_filters_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_entry_query_filters_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_search_bar_scope_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_search_bar_scope_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_entry_query_filters_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_entry_query_filters_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_search_bar_scope_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_search_bar_scope_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "pages_blocks_entry_query_filters_orientation" ADD CONSTRAINT "pages_blocks_entry_query_filters_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_bar_scope_orientation" ADD CONSTRAINT "pages_blocks_search_bar_scope_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_search_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query_filters_orientation" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_bar_scope_orientation" ADD CONSTRAINT "_pages_v_blocks_search_bar_scope_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_search_bar"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_entry_query_filters_orientation_order_idx" ON "pages_blocks_entry_query_filters_orientation" USING btree ("order");
  CREATE INDEX "pages_blocks_entry_query_filters_orientation_parent_idx" ON "pages_blocks_entry_query_filters_orientation" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_search_bar_scope_orientation_order_idx" ON "pages_blocks_search_bar_scope_orientation" USING btree ("order");
  CREATE INDEX "pages_blocks_search_bar_scope_orientation_parent_idx" ON "pages_blocks_search_bar_scope_orientation" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_orientation_order_idx" ON "_pages_v_blocks_entry_query_filters_orientation" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_orientation_parent_idx" ON "_pages_v_blocks_entry_query_filters_orientation" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_search_bar_scope_orientation_order_idx" ON "_pages_v_blocks_search_bar_scope_orientation" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_search_bar_scope_orientation_parent_idx" ON "_pages_v_blocks_search_bar_scope_orientation" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_entry_query_filters_orientation" CASCADE;
  DROP TABLE "pages_blocks_search_bar_scope_orientation" CASCADE;
  DROP TABLE "_pages_v_blocks_entry_query_filters_orientation" CASCADE;
  DROP TABLE "_pages_v_blocks_search_bar_scope_orientation" CASCADE;
  ALTER TABLE "pages_blocks_stats_stats" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_stats_stats" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_pages_blocks_stats_stats_source";
  CREATE TYPE "public"."enum_pages_blocks_stats_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'awardTotal', 'fileCount');
  ALTER TABLE "pages_blocks_stats_stats" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_pages_blocks_stats_stats_source";
  ALTER TABLE "pages_blocks_stats_stats" ALTER COLUMN "source" SET DATA TYPE "public"."enum_pages_blocks_stats_stats_source" USING "source"::"public"."enum_pages_blocks_stats_stats_source";
  ALTER TABLE "_pages_v_blocks_stats_stats" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_stats_stats" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum__pages_v_blocks_stats_stats_source";
  CREATE TYPE "public"."enum__pages_v_blocks_stats_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'awardTotal', 'fileCount');
  ALTER TABLE "_pages_v_blocks_stats_stats" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum__pages_v_blocks_stats_stats_source";
  ALTER TABLE "_pages_v_blocks_stats_stats" ALTER COLUMN "source" SET DATA TYPE "public"."enum__pages_v_blocks_stats_stats_source" USING "source"::"public"."enum__pages_v_blocks_stats_stats_source";
  DROP TYPE "public"."enum_pages_blocks_entry_query_filters_orientation";
  DROP TYPE "public"."enum_pages_blocks_search_bar_scope_orientation";
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_filters_orientation";
  DROP TYPE "public"."enum__pages_v_blocks_search_bar_scope_orientation";`)
}
