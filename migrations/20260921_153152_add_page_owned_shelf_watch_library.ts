import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_library_browser_facets" AS ENUM('media', 'kind', 'orientation', 'occasion', 'brand', 'subject', 'person', 'location', 'issue', 'year', 'film', 'event');
  CREATE TYPE "public"."enum_pages_blocks_library_browser_default_sort" AS ENUM('relevance', 'largest', 'newest', 'oldest', 'az');
  CREATE TYPE "public"."enum__pages_v_blocks_library_browser_facets" AS ENUM('media', 'kind', 'orientation', 'occasion', 'brand', 'subject', 'person', 'location', 'issue', 'year', 'film', 'event');
  CREATE TYPE "public"."enum__pages_v_blocks_library_browser_default_sort" AS ENUM('relevance', 'largest', 'newest', 'oldest', 'az');
  CREATE TABLE "pages_blocks_library_browser_facets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_library_browser_facets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_magazine_shelf_issues" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"read_url" varchar,
  	"assets_url" varchar
  );
  
  CREATE TABLE "pages_blocks_watch_grid_films_watch" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"free" boolean
  );
  
  CREATE TABLE "pages_blocks_watch_grid_films" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"title" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_library_browser_facets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_library_browser_facets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_magazine_shelf_issues" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"read_url" varchar,
  	"assets_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_watch_grid_films_watch" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"free" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_watch_grid_films" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_library_browser" ADD COLUMN "default_sort" "enum_pages_blocks_library_browser_default_sort";
  ALTER TABLE "pages_blocks_library_browser" ADD COLUMN "empty_heading" varchar;
  ALTER TABLE "pages_blocks_library_browser" ADD COLUMN "empty_body" varchar;
  ALTER TABLE "_pages_v_blocks_library_browser" ADD COLUMN "default_sort" "enum__pages_v_blocks_library_browser_default_sort";
  ALTER TABLE "_pages_v_blocks_library_browser" ADD COLUMN "empty_heading" varchar;
  ALTER TABLE "_pages_v_blocks_library_browser" ADD COLUMN "empty_body" varchar;
  ALTER TABLE "pages_blocks_library_browser_facets" ADD CONSTRAINT "pages_blocks_library_browser_facets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_magazine_shelf_issues" ADD CONSTRAINT "pages_blocks_magazine_shelf_issues_source_id_entries_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_magazine_shelf_issues" ADD CONSTRAINT "pages_blocks_magazine_shelf_issues_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_magazine_shelf"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_watch_grid_films_watch" ADD CONSTRAINT "pages_blocks_watch_grid_films_watch_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_watch_grid_films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_watch_grid_films" ADD CONSTRAINT "pages_blocks_watch_grid_films_source_id_films_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_watch_grid_films" ADD CONSTRAINT "pages_blocks_watch_grid_films_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_watch_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_library_browser_facets" ADD CONSTRAINT "_pages_v_blocks_library_browser_facets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_library_browser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_magazine_shelf_issues" ADD CONSTRAINT "_pages_v_blocks_magazine_shelf_issues_source_id_entries_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_magazine_shelf_issues" ADD CONSTRAINT "_pages_v_blocks_magazine_shelf_issues_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_magazine_shelf"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_watch_grid_films_watch" ADD CONSTRAINT "_pages_v_blocks_watch_grid_films_watch_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_watch_grid_films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_watch_grid_films" ADD CONSTRAINT "_pages_v_blocks_watch_grid_films_source_id_films_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_watch_grid_films" ADD CONSTRAINT "_pages_v_blocks_watch_grid_films_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_watch_grid"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_library_browser_facets_order_idx" ON "pages_blocks_library_browser_facets" USING btree ("order");
  CREATE INDEX "pages_blocks_library_browser_facets_parent_idx" ON "pages_blocks_library_browser_facets" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_magazine_shelf_issues_order_idx" ON "pages_blocks_magazine_shelf_issues" USING btree ("_order");
  CREATE INDEX "pages_blocks_magazine_shelf_issues_parent_id_idx" ON "pages_blocks_magazine_shelf_issues" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_magazine_shelf_issues_source_idx" ON "pages_blocks_magazine_shelf_issues" USING btree ("source_id");
  CREATE INDEX "pages_blocks_watch_grid_films_watch_order_idx" ON "pages_blocks_watch_grid_films_watch" USING btree ("_order");
  CREATE INDEX "pages_blocks_watch_grid_films_watch_parent_id_idx" ON "pages_blocks_watch_grid_films_watch" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_watch_grid_films_order_idx" ON "pages_blocks_watch_grid_films" USING btree ("_order");
  CREATE INDEX "pages_blocks_watch_grid_films_parent_id_idx" ON "pages_blocks_watch_grid_films" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_watch_grid_films_source_idx" ON "pages_blocks_watch_grid_films" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_library_browser_facets_order_idx" ON "_pages_v_blocks_library_browser_facets" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_library_browser_facets_parent_idx" ON "_pages_v_blocks_library_browser_facets" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_issues_order_idx" ON "_pages_v_blocks_magazine_shelf_issues" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_issues_parent_id_idx" ON "_pages_v_blocks_magazine_shelf_issues" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_magazine_shelf_issues_source_idx" ON "_pages_v_blocks_magazine_shelf_issues" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_watch_grid_films_watch_order_idx" ON "_pages_v_blocks_watch_grid_films_watch" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_watch_grid_films_watch_parent_id_idx" ON "_pages_v_blocks_watch_grid_films_watch" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_watch_grid_films_order_idx" ON "_pages_v_blocks_watch_grid_films" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_watch_grid_films_parent_id_idx" ON "_pages_v_blocks_watch_grid_films" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_watch_grid_films_source_idx" ON "_pages_v_blocks_watch_grid_films" USING btree ("source_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_library_browser_facets" CASCADE;
  DROP TABLE "pages_blocks_magazine_shelf_issues" CASCADE;
  DROP TABLE "pages_blocks_watch_grid_films_watch" CASCADE;
  DROP TABLE "pages_blocks_watch_grid_films" CASCADE;
  DROP TABLE "_pages_v_blocks_library_browser_facets" CASCADE;
  DROP TABLE "_pages_v_blocks_magazine_shelf_issues" CASCADE;
  DROP TABLE "_pages_v_blocks_watch_grid_films_watch" CASCADE;
  DROP TABLE "_pages_v_blocks_watch_grid_films" CASCADE;
  ALTER TABLE "pages_blocks_library_browser" DROP COLUMN "default_sort";
  ALTER TABLE "pages_blocks_library_browser" DROP COLUMN "empty_heading";
  ALTER TABLE "pages_blocks_library_browser" DROP COLUMN "empty_body";
  ALTER TABLE "_pages_v_blocks_library_browser" DROP COLUMN "default_sort";
  ALTER TABLE "_pages_v_blocks_library_browser" DROP COLUMN "empty_heading";
  ALTER TABLE "_pages_v_blocks_library_browser" DROP COLUMN "empty_body";
  DROP TYPE "public"."enum_pages_blocks_library_browser_facets";
  DROP TYPE "public"."enum_pages_blocks_library_browser_default_sort";
  DROP TYPE "public"."enum__pages_v_blocks_library_browser_facets";
  DROP TYPE "public"."enum__pages_v_blocks_library_browser_default_sort";`)
}
