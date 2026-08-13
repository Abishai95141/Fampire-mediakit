import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_feature_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'eventCount', 'fileCount', 'awardTotal');
  CREATE TYPE "public"."enum_pages_blocks_hero_feature_actions_emphasis" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_pages_blocks_library_browser_locked_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum_pages_blocks_library_browser_locked_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  CREATE TYPE "public"."enum_pages_blocks_film_strip_layout" AS ENUM('list', 'grid', 'profiles');
  CREATE TYPE "public"."enum_pages_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_feature_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'eventCount', 'fileCount', 'awardTotal');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_feature_actions_emphasis" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_library_browser_locked_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum__pages_v_blocks_library_browser_locked_orientation" AS ENUM('portrait', 'landscape', 'square', 'mixed');
  CREATE TYPE "public"."enum__pages_v_blocks_film_strip_layout" AS ENUM('list', 'grid', 'profiles');
  CREATE TYPE "public"."enum__pages_v_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles');
  CREATE TABLE "appearances_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "_appearances_v_version_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_feature_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"source" "enum_pages_blocks_hero_feature_stats_source" DEFAULT 'entryCount'
  );
  
  CREATE TABLE "pages_blocks_hero_feature_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"emphasis" "enum_pages_blocks_hero_feature_actions_emphasis" DEFAULT 'primary'
  );
  
  CREATE TABLE "pages_blocks_hero_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"intro" varchar,
  	"video_id" varchar,
  	"start_at" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"secondary" varchar,
  	"action_label" varchar,
  	"action_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_library_browser_locked_kind" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_library_browser_locked_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_library_browser_locked_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_library_browser_locked_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_library_browser" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"per_page" numeric DEFAULT 60,
  	"show_facets" boolean DEFAULT true,
  	"show_search" boolean DEFAULT true,
  	"show_sort" boolean DEFAULT true,
  	"show_count" boolean DEFAULT true,
  	"locked_brand_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_magazine_shelf" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"aside" varchar,
  	"limit" numeric DEFAULT 12,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_watch_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"note" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_press_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"featured_count" numeric DEFAULT 3,
  	"limit" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_feature_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"source" "enum__pages_v_blocks_hero_feature_stats_source" DEFAULT 'entryCount',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_feature_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"emphasis" "enum__pages_v_blocks_hero_feature_actions_emphasis" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"intro" varchar,
  	"video_id" varchar,
  	"start_at" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"secondary" varchar,
  	"action_label" varchar,
  	"action_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_library_browser_locked_kind" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_library_browser_locked_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_library_browser_locked_orientation" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_library_browser_locked_orientation",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_library_browser" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"per_page" numeric DEFAULT 60,
  	"show_facets" boolean DEFAULT true,
  	"show_search" boolean DEFAULT true,
  	"show_sort" boolean DEFAULT true,
  	"show_count" boolean DEFAULT true,
  	"locked_brand_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_magazine_shelf" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"aside" varchar,
  	"limit" numeric DEFAULT 12,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_watch_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"note" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_press_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"featured_count" numeric DEFAULT 3,
  	"limit" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "show_bios" SET DEFAULT true;
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "show_bios" SET DEFAULT true;
  ALTER TABLE "appearances" ADD COLUMN "views" numeric;
  ALTER TABLE "appearances" ADD COLUMN "views_as_of" varchar;
  ALTER TABLE "appearances" ADD COLUMN "thumbnail" varchar;
  ALTER TABLE "_appearances_v" ADD COLUMN "version_views" numeric;
  ALTER TABLE "_appearances_v" ADD COLUMN "version_views_as_of" varchar;
  ALTER TABLE "_appearances_v" ADD COLUMN "version_thumbnail" varchar;
  ALTER TABLE "pages_blocks_film_strip" ADD COLUMN "layout" "enum_pages_blocks_film_strip_layout" DEFAULT 'list';
  ALTER TABLE "pages_blocks_people_row" ADD COLUMN "layout" "enum_pages_blocks_people_row_layout" DEFAULT 'portraits';
  ALTER TABLE "_pages_v_blocks_film_strip" ADD COLUMN "layout" "enum__pages_v_blocks_film_strip_layout" DEFAULT 'list';
  ALTER TABLE "_pages_v_blocks_people_row" ADD COLUMN "layout" "enum__pages_v_blocks_people_row_layout" DEFAULT 'portraits';
  ALTER TABLE "appearances_parts" ADD CONSTRAINT "appearances_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."appearances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_appearances_v_version_parts" ADD CONSTRAINT "_appearances_v_version_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_appearances_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_feature_stats" ADD CONSTRAINT "pages_blocks_hero_feature_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_feature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_feature_actions" ADD CONSTRAINT "pages_blocks_hero_feature_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_feature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_feature" ADD CONSTRAINT "pages_blocks_hero_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement" ADD CONSTRAINT "pages_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_library_browser_locked_kind" ADD CONSTRAINT "pages_blocks_library_browser_locked_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_library_browser_locked_orientation" ADD CONSTRAINT "pages_blocks_library_browser_locked_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_library_browser" ADD CONSTRAINT "pages_blocks_library_browser_locked_brand_id_brands_id_fk" FOREIGN KEY ("locked_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_library_browser" ADD CONSTRAINT "pages_blocks_library_browser_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_magazine_shelf" ADD CONSTRAINT "pages_blocks_magazine_shelf_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_watch_grid" ADD CONSTRAINT "pages_blocks_watch_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list" ADD CONSTRAINT "pages_blocks_press_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_feature_stats" ADD CONSTRAINT "_pages_v_blocks_hero_feature_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_feature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_feature_actions" ADD CONSTRAINT "_pages_v_blocks_hero_feature_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_feature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_feature" ADD CONSTRAINT "_pages_v_blocks_hero_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement" ADD CONSTRAINT "_pages_v_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_library_browser_locked_kind" ADD CONSTRAINT "_pages_v_blocks_library_browser_locked_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_library_browser_locked_orientation" ADD CONSTRAINT "_pages_v_blocks_library_browser_locked_orientation_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_library_browser" ADD CONSTRAINT "_pages_v_blocks_library_browser_locked_brand_id_brands_id_fk" FOREIGN KEY ("locked_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_library_browser" ADD CONSTRAINT "_pages_v_blocks_library_browser_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_magazine_shelf" ADD CONSTRAINT "_pages_v_blocks_magazine_shelf_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_watch_grid" ADD CONSTRAINT "_pages_v_blocks_watch_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list" ADD CONSTRAINT "_pages_v_blocks_press_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "appearances_parts_order_idx" ON "appearances_parts" USING btree ("_order");
  CREATE INDEX "appearances_parts_parent_id_idx" ON "appearances_parts" USING btree ("_parent_id");
  CREATE INDEX "_appearances_v_version_parts_order_idx" ON "_appearances_v_version_parts" USING btree ("_order");
  CREATE INDEX "_appearances_v_version_parts_parent_id_idx" ON "_appearances_v_version_parts" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_feature_stats_order_idx" ON "pages_blocks_hero_feature_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_feature_stats_parent_id_idx" ON "pages_blocks_hero_feature_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_feature_actions_order_idx" ON "pages_blocks_hero_feature_actions" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_feature_actions_parent_id_idx" ON "pages_blocks_hero_feature_actions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_feature_order_idx" ON "pages_blocks_hero_feature" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_feature_parent_id_idx" ON "pages_blocks_hero_feature" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_feature_path_idx" ON "pages_blocks_hero_feature" USING btree ("_path");
  CREATE INDEX "pages_blocks_statement_order_idx" ON "pages_blocks_statement" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_parent_id_idx" ON "pages_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_path_idx" ON "pages_blocks_statement" USING btree ("_path");
  CREATE INDEX "pages_blocks_library_browser_locked_kind_order_idx" ON "pages_blocks_library_browser_locked_kind" USING btree ("order");
  CREATE INDEX "pages_blocks_library_browser_locked_kind_parent_idx" ON "pages_blocks_library_browser_locked_kind" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_library_browser_locked_orientation_order_idx" ON "pages_blocks_library_browser_locked_orientation" USING btree ("order");
  CREATE INDEX "pages_blocks_library_browser_locked_orientation_parent_idx" ON "pages_blocks_library_browser_locked_orientation" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_library_browser_order_idx" ON "pages_blocks_library_browser" USING btree ("_order");
  CREATE INDEX "pages_blocks_library_browser_parent_id_idx" ON "pages_blocks_library_browser" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_library_browser_path_idx" ON "pages_blocks_library_browser" USING btree ("_path");
  CREATE INDEX "pages_blocks_library_browser_locked_locked_brand_idx" ON "pages_blocks_library_browser" USING btree ("locked_brand_id");
  CREATE INDEX "pages_blocks_magazine_shelf_order_idx" ON "pages_blocks_magazine_shelf" USING btree ("_order");
  CREATE INDEX "pages_blocks_magazine_shelf_parent_id_idx" ON "pages_blocks_magazine_shelf" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_magazine_shelf_path_idx" ON "pages_blocks_magazine_shelf" USING btree ("_path");
  CREATE INDEX "pages_blocks_watch_grid_order_idx" ON "pages_blocks_watch_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_watch_grid_parent_id_idx" ON "pages_blocks_watch_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_watch_grid_path_idx" ON "pages_blocks_watch_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_press_list_order_idx" ON "pages_blocks_press_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_press_list_parent_id_idx" ON "pages_blocks_press_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_press_list_path_idx" ON "pages_blocks_press_list" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_feature_stats_order_idx" ON "_pages_v_blocks_hero_feature_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_feature_stats_parent_id_idx" ON "_pages_v_blocks_hero_feature_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_feature_actions_order_idx" ON "_pages_v_blocks_hero_feature_actions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_feature_actions_parent_id_idx" ON "_pages_v_blocks_hero_feature_actions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_feature_order_idx" ON "_pages_v_blocks_hero_feature" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_feature_parent_id_idx" ON "_pages_v_blocks_hero_feature" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_feature_path_idx" ON "_pages_v_blocks_hero_feature" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_statement_order_idx" ON "_pages_v_blocks_statement" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_parent_id_idx" ON "_pages_v_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_path_idx" ON "_pages_v_blocks_statement" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_library_browser_locked_kind_order_idx" ON "_pages_v_blocks_library_browser_locked_kind" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_library_browser_locked_kind_parent_idx" ON "_pages_v_blocks_library_browser_locked_kind" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_library_browser_locked_orientation_order_idx" ON "_pages_v_blocks_library_browser_locked_orientation" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_library_browser_locked_orientation_parent_idx" ON "_pages_v_blocks_library_browser_locked_orientation" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_library_browser_order_idx" ON "_pages_v_blocks_library_browser" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_library_browser_parent_id_idx" ON "_pages_v_blocks_library_browser" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_library_browser_path_idx" ON "_pages_v_blocks_library_browser" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_library_browser_locked_locked_brand_idx" ON "_pages_v_blocks_library_browser" USING btree ("locked_brand_id");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_order_idx" ON "_pages_v_blocks_magazine_shelf" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_parent_id_idx" ON "_pages_v_blocks_magazine_shelf" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_path_idx" ON "_pages_v_blocks_magazine_shelf" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_watch_grid_order_idx" ON "_pages_v_blocks_watch_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_watch_grid_parent_id_idx" ON "_pages_v_blocks_watch_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_watch_grid_path_idx" ON "_pages_v_blocks_watch_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_press_list_order_idx" ON "_pages_v_blocks_press_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_press_list_parent_id_idx" ON "_pages_v_blocks_press_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_press_list_path_idx" ON "_pages_v_blocks_press_list" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appearances_parts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_appearances_v_version_parts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_feature_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_feature_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_feature" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_library_browser_locked_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_library_browser_locked_orientation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_library_browser" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_magazine_shelf" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_watch_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_press_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_feature_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_feature_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_feature" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_library_browser_locked_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_library_browser_locked_orientation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_library_browser" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_magazine_shelf" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_watch_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_press_list" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "appearances_parts" CASCADE;
  DROP TABLE "_appearances_v_version_parts" CASCADE;
  DROP TABLE "pages_blocks_hero_feature_stats" CASCADE;
  DROP TABLE "pages_blocks_hero_feature_actions" CASCADE;
  DROP TABLE "pages_blocks_hero_feature" CASCADE;
  DROP TABLE "pages_blocks_statement" CASCADE;
  DROP TABLE "pages_blocks_library_browser_locked_kind" CASCADE;
  DROP TABLE "pages_blocks_library_browser_locked_orientation" CASCADE;
  DROP TABLE "pages_blocks_library_browser" CASCADE;
  DROP TABLE "pages_blocks_magazine_shelf" CASCADE;
  DROP TABLE "pages_blocks_watch_grid" CASCADE;
  DROP TABLE "pages_blocks_press_list" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_feature_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_feature_actions" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_feature" CASCADE;
  DROP TABLE "_pages_v_blocks_statement" CASCADE;
  DROP TABLE "_pages_v_blocks_library_browser_locked_kind" CASCADE;
  DROP TABLE "_pages_v_blocks_library_browser_locked_orientation" CASCADE;
  DROP TABLE "_pages_v_blocks_library_browser" CASCADE;
  DROP TABLE "_pages_v_blocks_magazine_shelf" CASCADE;
  DROP TABLE "_pages_v_blocks_watch_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_press_list" CASCADE;
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "show_bios" SET DEFAULT false;
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "show_bios" SET DEFAULT false;
  ALTER TABLE "appearances" DROP COLUMN "views";
  ALTER TABLE "appearances" DROP COLUMN "views_as_of";
  ALTER TABLE "appearances" DROP COLUMN "thumbnail";
  ALTER TABLE "_appearances_v" DROP COLUMN "version_views";
  ALTER TABLE "_appearances_v" DROP COLUMN "version_views_as_of";
  ALTER TABLE "_appearances_v" DROP COLUMN "version_thumbnail";
  ALTER TABLE "pages_blocks_film_strip" DROP COLUMN "layout";
  ALTER TABLE "pages_blocks_people_row" DROP COLUMN "layout";
  ALTER TABLE "_pages_v_blocks_film_strip" DROP COLUMN "layout";
  ALTER TABLE "_pages_v_blocks_people_row" DROP COLUMN "layout";
  DROP TYPE "public"."enum_pages_blocks_hero_feature_stats_source";
  DROP TYPE "public"."enum_pages_blocks_hero_feature_actions_emphasis";
  DROP TYPE "public"."enum_pages_blocks_library_browser_locked_kind";
  DROP TYPE "public"."enum_pages_blocks_library_browser_locked_orientation";
  DROP TYPE "public"."enum_pages_blocks_film_strip_layout";
  DROP TYPE "public"."enum_pages_blocks_people_row_layout";
  DROP TYPE "public"."enum__pages_v_blocks_hero_feature_stats_source";
  DROP TYPE "public"."enum__pages_v_blocks_hero_feature_actions_emphasis";
  DROP TYPE "public"."enum__pages_v_blocks_library_browser_locked_kind";
  DROP TYPE "public"."enum__pages_v_blocks_library_browser_locked_orientation";
  DROP TYPE "public"."enum__pages_v_blocks_film_strip_layout";
  DROP TYPE "public"."enum__pages_v_blocks_people_row_layout";`)
}
