import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_usage" AS ENUM('header', 'article', 'brand', 'portrait', 'og', 'other');
  CREATE TYPE "public"."enum_articles_type" AS ENUM('press-release', 'announcement', 'feature', 'statement', 'coverage');
  CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articles_v_version_type" AS ENUM('press-release', 'announcement', 'feature', 'statement', 'coverage');
  CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_magazine_issues_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__magazine_issues_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_appearances_type" AS ENUM('podcast', 'panel', 'keynote', 'broadcast', 'print', 'conference');
  CREATE TYPE "public"."enum_appearances_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__appearances_v_version_type" AS ENUM('podcast', 'panel', 'keynote', 'broadcast', 'print', 'conference');
  CREATE TYPE "public"."enum__appearances_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"credit" varchar,
  	"usage" "enum_media_usage",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"type" "enum_articles_type" DEFAULT 'press-release',
  	"published_at" timestamp(3) with time zone,
  	"excerpt" varchar,
  	"hero_image_id" integer,
  	"body" jsonb,
  	"external_url" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"films_id" integer,
  	"events_id" integer,
  	"entries_id" integer
  );
  
  CREATE TABLE "_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_type" "enum__articles_v_version_type" DEFAULT 'press-release',
  	"version_published_at" timestamp(3) with time zone,
  	"version_excerpt" varchar,
  	"version_hero_image_id" integer,
  	"version_body" jsonb,
  	"version_external_url" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"films_id" integer,
  	"events_id" integer,
  	"entries_id" integer
  );
  
  CREATE TABLE "magazine_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"issue_number" numeric,
  	"title" varchar,
  	"slug" varchar,
  	"cover_subject_id" integer,
  	"cover_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"summary" varchar,
  	"read_url" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_magazine_issues_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "magazine_issues_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"entries_id" integer
  );
  
  CREATE TABLE "_magazine_issues_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_issue_number" numeric,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_cover_subject_id" integer,
  	"version_cover_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_summary" varchar,
  	"version_read_url" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__magazine_issues_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_magazine_issues_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"entries_id" integer
  );
  
  CREATE TABLE "appearances" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"outlet" varchar,
  	"date" timestamp(3) with time zone,
  	"type" "enum_appearances_type" DEFAULT 'podcast',
  	"url" varchar,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_appearances_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "appearances_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "_appearances_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar,
  	"version_outlet" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_type" "enum__appearances_v_version_type" DEFAULT 'podcast',
  	"version_url" varchar,
  	"version_summary" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__appearances_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_appearances_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "magazine_issues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "appearances_id" integer;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_tenant_id_brands_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "magazine_issues" ADD CONSTRAINT "magazine_issues_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "magazine_issues" ADD CONSTRAINT "magazine_issues_cover_subject_id_people_id_fk" FOREIGN KEY ("cover_subject_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "magazine_issues" ADD CONSTRAINT "magazine_issues_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "magazine_issues" ADD CONSTRAINT "magazine_issues_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "magazine_issues_rels" ADD CONSTRAINT "magazine_issues_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."magazine_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "magazine_issues_rels" ADD CONSTRAINT "magazine_issues_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v" ADD CONSTRAINT "_magazine_issues_v_parent_id_magazine_issues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."magazine_issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v" ADD CONSTRAINT "_magazine_issues_v_version_tenant_id_brands_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v" ADD CONSTRAINT "_magazine_issues_v_version_cover_subject_id_people_id_fk" FOREIGN KEY ("version_cover_subject_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v" ADD CONSTRAINT "_magazine_issues_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v" ADD CONSTRAINT "_magazine_issues_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v_rels" ADD CONSTRAINT "_magazine_issues_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_magazine_issues_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_magazine_issues_v_rels" ADD CONSTRAINT "_magazine_issues_v_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "appearances" ADD CONSTRAINT "appearances_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appearances_rels" ADD CONSTRAINT "appearances_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."appearances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "appearances_rels" ADD CONSTRAINT "appearances_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_appearances_v" ADD CONSTRAINT "_appearances_v_parent_id_appearances_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."appearances"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_appearances_v" ADD CONSTRAINT "_appearances_v_version_tenant_id_brands_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_appearances_v_rels" ADD CONSTRAINT "_appearances_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_appearances_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_appearances_v_rels" ADD CONSTRAINT "_appearances_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "articles_tenant_idx" ON "articles" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_type_idx" ON "articles" USING btree ("type");
  CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");
  CREATE INDEX "articles_hero_image_idx" ON "articles" USING btree ("hero_image_id");
  CREATE INDEX "articles_seo_image_idx" ON "articles" USING btree ("seo_image_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_people_id_idx" ON "articles_rels" USING btree ("people_id");
  CREATE INDEX "articles_rels_films_id_idx" ON "articles_rels" USING btree ("films_id");
  CREATE INDEX "articles_rels_events_id_idx" ON "articles_rels" USING btree ("events_id");
  CREATE INDEX "articles_rels_entries_id_idx" ON "articles_rels" USING btree ("entries_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_tenant_idx" ON "_articles_v" USING btree ("version_tenant_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_type_idx" ON "_articles_v" USING btree ("version_type");
  CREATE INDEX "_articles_v_version_version_published_at_idx" ON "_articles_v" USING btree ("version_published_at");
  CREATE INDEX "_articles_v_version_version_hero_image_idx" ON "_articles_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_articles_v_version_version_seo_image_idx" ON "_articles_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_people_id_idx" ON "_articles_v_rels" USING btree ("people_id");
  CREATE INDEX "_articles_v_rels_films_id_idx" ON "_articles_v_rels" USING btree ("films_id");
  CREATE INDEX "_articles_v_rels_events_id_idx" ON "_articles_v_rels" USING btree ("events_id");
  CREATE INDEX "_articles_v_rels_entries_id_idx" ON "_articles_v_rels" USING btree ("entries_id");
  CREATE INDEX "magazine_issues_tenant_idx" ON "magazine_issues" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "magazine_issues_issue_number_idx" ON "magazine_issues" USING btree ("issue_number");
  CREATE UNIQUE INDEX "magazine_issues_slug_idx" ON "magazine_issues" USING btree ("slug");
  CREATE INDEX "magazine_issues_cover_subject_idx" ON "magazine_issues" USING btree ("cover_subject_id");
  CREATE INDEX "magazine_issues_cover_image_idx" ON "magazine_issues" USING btree ("cover_image_id");
  CREATE INDEX "magazine_issues_seo_image_idx" ON "magazine_issues" USING btree ("seo_image_id");
  CREATE INDEX "magazine_issues_updated_at_idx" ON "magazine_issues" USING btree ("updated_at");
  CREATE INDEX "magazine_issues_created_at_idx" ON "magazine_issues" USING btree ("created_at");
  CREATE INDEX "magazine_issues__status_idx" ON "magazine_issues" USING btree ("_status");
  CREATE INDEX "magazine_issues_rels_order_idx" ON "magazine_issues_rels" USING btree ("order");
  CREATE INDEX "magazine_issues_rels_parent_idx" ON "magazine_issues_rels" USING btree ("parent_id");
  CREATE INDEX "magazine_issues_rels_path_idx" ON "magazine_issues_rels" USING btree ("path");
  CREATE INDEX "magazine_issues_rels_entries_id_idx" ON "magazine_issues_rels" USING btree ("entries_id");
  CREATE INDEX "_magazine_issues_v_parent_idx" ON "_magazine_issues_v" USING btree ("parent_id");
  CREATE INDEX "_magazine_issues_v_version_version_tenant_idx" ON "_magazine_issues_v" USING btree ("version_tenant_id");
  CREATE INDEX "_magazine_issues_v_version_version_issue_number_idx" ON "_magazine_issues_v" USING btree ("version_issue_number");
  CREATE INDEX "_magazine_issues_v_version_version_slug_idx" ON "_magazine_issues_v" USING btree ("version_slug");
  CREATE INDEX "_magazine_issues_v_version_version_cover_subject_idx" ON "_magazine_issues_v" USING btree ("version_cover_subject_id");
  CREATE INDEX "_magazine_issues_v_version_version_cover_image_idx" ON "_magazine_issues_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_magazine_issues_v_version_version_seo_image_idx" ON "_magazine_issues_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_magazine_issues_v_version_version_updated_at_idx" ON "_magazine_issues_v" USING btree ("version_updated_at");
  CREATE INDEX "_magazine_issues_v_version_version_created_at_idx" ON "_magazine_issues_v" USING btree ("version_created_at");
  CREATE INDEX "_magazine_issues_v_version_version__status_idx" ON "_magazine_issues_v" USING btree ("version__status");
  CREATE INDEX "_magazine_issues_v_created_at_idx" ON "_magazine_issues_v" USING btree ("created_at");
  CREATE INDEX "_magazine_issues_v_updated_at_idx" ON "_magazine_issues_v" USING btree ("updated_at");
  CREATE INDEX "_magazine_issues_v_latest_idx" ON "_magazine_issues_v" USING btree ("latest");
  CREATE INDEX "_magazine_issues_v_rels_order_idx" ON "_magazine_issues_v_rels" USING btree ("order");
  CREATE INDEX "_magazine_issues_v_rels_parent_idx" ON "_magazine_issues_v_rels" USING btree ("parent_id");
  CREATE INDEX "_magazine_issues_v_rels_path_idx" ON "_magazine_issues_v_rels" USING btree ("path");
  CREATE INDEX "_magazine_issues_v_rels_entries_id_idx" ON "_magazine_issues_v_rels" USING btree ("entries_id");
  CREATE INDEX "appearances_tenant_idx" ON "appearances" USING btree ("tenant_id");
  CREATE INDEX "appearances_date_idx" ON "appearances" USING btree ("date");
  CREATE INDEX "appearances_type_idx" ON "appearances" USING btree ("type");
  CREATE INDEX "appearances_updated_at_idx" ON "appearances" USING btree ("updated_at");
  CREATE INDEX "appearances_created_at_idx" ON "appearances" USING btree ("created_at");
  CREATE INDEX "appearances__status_idx" ON "appearances" USING btree ("_status");
  CREATE INDEX "appearances_rels_order_idx" ON "appearances_rels" USING btree ("order");
  CREATE INDEX "appearances_rels_parent_idx" ON "appearances_rels" USING btree ("parent_id");
  CREATE INDEX "appearances_rels_path_idx" ON "appearances_rels" USING btree ("path");
  CREATE INDEX "appearances_rels_people_id_idx" ON "appearances_rels" USING btree ("people_id");
  CREATE INDEX "_appearances_v_parent_idx" ON "_appearances_v" USING btree ("parent_id");
  CREATE INDEX "_appearances_v_version_version_tenant_idx" ON "_appearances_v" USING btree ("version_tenant_id");
  CREATE INDEX "_appearances_v_version_version_date_idx" ON "_appearances_v" USING btree ("version_date");
  CREATE INDEX "_appearances_v_version_version_type_idx" ON "_appearances_v" USING btree ("version_type");
  CREATE INDEX "_appearances_v_version_version_updated_at_idx" ON "_appearances_v" USING btree ("version_updated_at");
  CREATE INDEX "_appearances_v_version_version_created_at_idx" ON "_appearances_v" USING btree ("version_created_at");
  CREATE INDEX "_appearances_v_version_version__status_idx" ON "_appearances_v" USING btree ("version__status");
  CREATE INDEX "_appearances_v_created_at_idx" ON "_appearances_v" USING btree ("created_at");
  CREATE INDEX "_appearances_v_updated_at_idx" ON "_appearances_v" USING btree ("updated_at");
  CREATE INDEX "_appearances_v_latest_idx" ON "_appearances_v" USING btree ("latest");
  CREATE INDEX "_appearances_v_rels_order_idx" ON "_appearances_v_rels" USING btree ("order");
  CREATE INDEX "_appearances_v_rels_parent_idx" ON "_appearances_v_rels" USING btree ("parent_id");
  CREATE INDEX "_appearances_v_rels_path_idx" ON "_appearances_v_rels" USING btree ("path");
  CREATE INDEX "_appearances_v_rels_people_id_idx" ON "_appearances_v_rels" USING btree ("people_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_magazine_issues_fk" FOREIGN KEY ("magazine_issues_id") REFERENCES "public"."magazine_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_appearances_fk" FOREIGN KEY ("appearances_id") REFERENCES "public"."appearances"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_magazine_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("magazine_issues_id");
  CREATE INDEX "payload_locked_documents_rels_appearances_id_idx" ON "payload_locked_documents_rels" USING btree ("appearances_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "magazine_issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "magazine_issues_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_magazine_issues_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_magazine_issues_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "appearances" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "appearances_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_appearances_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_appearances_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "magazine_issues" CASCADE;
  DROP TABLE "magazine_issues_rels" CASCADE;
  DROP TABLE "_magazine_issues_v" CASCADE;
  DROP TABLE "_magazine_issues_v_rels" CASCADE;
  DROP TABLE "appearances" CASCADE;
  DROP TABLE "appearances_rels" CASCADE;
  DROP TABLE "_appearances_v" CASCADE;
  DROP TABLE "_appearances_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_articles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_magazine_issues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_appearances_fk";
  
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_articles_id_idx";
  DROP INDEX "payload_locked_documents_rels_magazine_issues_id_idx";
  DROP INDEX "payload_locked_documents_rels_appearances_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "magazine_issues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "appearances_id";
  DROP TYPE "public"."enum_media_usage";
  DROP TYPE "public"."enum_articles_type";
  DROP TYPE "public"."enum_articles_status";
  DROP TYPE "public"."enum__articles_v_version_type";
  DROP TYPE "public"."enum__articles_v_version_status";
  DROP TYPE "public"."enum_magazine_issues_status";
  DROP TYPE "public"."enum__magazine_issues_v_version_status";
  DROP TYPE "public"."enum_appearances_type";
  DROP TYPE "public"."enum_appearances_status";
  DROP TYPE "public"."enum__appearances_v_version_type";
  DROP TYPE "public"."enum__appearances_v_version_status";`)
}
