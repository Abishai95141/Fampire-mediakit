import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_entries_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum_entries_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  CREATE TYPE "public"."enum_entries_minor_risk" AS ENUM('named', 'context', 'none');
  CREATE TYPE "public"."enum_entries_source_platform" AS ENUM('drive', 'dropbox', 'pictime', 'vimeo', 'youtube', 'streaming', 'site', 'unknown');
  CREATE TYPE "public"."enum_entries_access" AS ENUM('public', 'password', 'request', 'broken');
  CREATE TYPE "public"."enum_entries_link_status" AS ENUM('unchecked', 'ok', 'gone', 'login-required', 'password', 'timeout', 'blocked');
  CREATE TYPE "public"."enum_entries_dominant_media" AS ENUM('image', 'video', 'document', 'audio', 'vector', 'other');
  CREATE TYPE "public"."enum_entries_orientation" AS ENUM('landscape', 'portrait', 'mixed', 'square');
  CREATE TYPE "public"."enum_entries_resolution_class" AS ENUM('web', 'print', 'unknown');
  CREATE TYPE "public"."enum_entries_import_disposition" AS ENUM('publish', 'merge', 'reject');
  CREATE TYPE "public"."enum_entries_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__entries_v_version_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum__entries_v_version_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  CREATE TYPE "public"."enum__entries_v_version_minor_risk" AS ENUM('named', 'context', 'none');
  CREATE TYPE "public"."enum__entries_v_version_source_platform" AS ENUM('drive', 'dropbox', 'pictime', 'vimeo', 'youtube', 'streaming', 'site', 'unknown');
  CREATE TYPE "public"."enum__entries_v_version_access" AS ENUM('public', 'password', 'request', 'broken');
  CREATE TYPE "public"."enum__entries_v_version_link_status" AS ENUM('unchecked', 'ok', 'gone', 'login-required', 'password', 'timeout', 'blocked');
  CREATE TYPE "public"."enum__entries_v_version_dominant_media" AS ENUM('image', 'video', 'document', 'audio', 'vector', 'other');
  CREATE TYPE "public"."enum__entries_v_version_orientation" AS ENUM('landscape', 'portrait', 'mixed', 'square');
  CREATE TYPE "public"."enum__entries_v_version_resolution_class" AS ENUM('web', 'print', 'unknown');
  CREATE TYPE "public"."enum__entries_v_version_import_disposition" AS ENUM('publish', 'merge', 'reject');
  CREATE TYPE "public"."enum__entries_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_pages_blocks_hero_actions_emphasis" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_pages_blocks_hero_media" AS ENUM('none', 'video', 'image');
  CREATE TYPE "public"."enum_pages_blocks_rich_text_width" AS ENUM('prose', 'full');
  CREATE TYPE "public"."enum_pages_blocks_entry_query_filters_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum_pages_blocks_entry_query_filters_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  CREATE TYPE "public"."enum_pages_blocks_entry_query_layout" AS ENUM('grid', 'row', 'list', 'spotlight');
  CREATE TYPE "public"."enum_pages_blocks_entry_query_sort" AS ENUM('-fileCount', '-dateStart', 'dateStart', 'title');
  CREATE TYPE "public"."enum_pages_blocks_entry_picks_layout" AS ENUM('grid', 'row', 'list');
  CREATE TYPE "public"."enum_pages_blocks_stats_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'awardTotal', 'fileCount');
  CREATE TYPE "public"."enum_pages_blocks_embed_aspect" AS ENUM('16-9', '9-16', '1-1');
  CREATE TYPE "public"."enum_pages_blocks_search_bar_scope_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum_pages_blocks_columns_columns_width" AS ENUM('equal', 'wide', 'narrow');
  CREATE TYPE "public"."enum_pages_blocks_divider_spacing" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_actions_emphasis" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_media" AS ENUM('none', 'video', 'image');
  CREATE TYPE "public"."enum__pages_v_blocks_rich_text_width" AS ENUM('prose', 'full');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_filters_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_layout" AS ENUM('grid', 'row', 'list', 'spotlight');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_sort" AS ENUM('-fileCount', '-dateStart', 'dateStart', 'title');
  CREATE TYPE "public"."enum__pages_v_blocks_entry_picks_layout" AS ENUM('grid', 'row', 'list');
  CREATE TYPE "public"."enum__pages_v_blocks_stats_stats_source" AS ENUM('manual', 'entryCount', 'filmCount', 'awardTotal', 'fileCount');
  CREATE TYPE "public"."enum__pages_v_blocks_embed_aspect" AS ENUM('16-9', '9-16', '1-1');
  CREATE TYPE "public"."enum__pages_v_blocks_search_bar_scope_kind" AS ENUM('b-roll', 'event photography', 'headshots', 'poster', 'logo', 'trailer', 'BTS', 'podcast', 'press', 'magazine', 'document', 'interview', 'audio');
  CREATE TYPE "public"."enum__pages_v_blocks_columns_columns_width" AS ENUM('equal', 'wide', 'narrow');
  CREATE TYPE "public"."enum__pages_v_blocks_divider_spacing" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_films_status" AS ENUM('released', 'in-production', 'pre-production');
  CREATE TABLE "entries_alternates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "entries_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"url" varchar,
  	"rewritten_from" varchar,
  	"alt_text" varchar,
  	"kind" "enum_entries_kind",
  	"occasion" "enum_entries_occasion",
  	"film_id" integer,
  	"event_id" integer,
  	"location_id" integer,
  	"year" numeric,
  	"date_start" timestamp(3) with time zone,
  	"date_end" timestamp(3) with time zone,
  	"magazine_issue" numeric,
  	"minor_risk" "enum_entries_minor_risk" DEFAULT 'none',
  	"contains_minor" boolean DEFAULT false,
  	"contains_minor_confirmed" boolean DEFAULT false,
  	"safety_note" varchar,
  	"source_platform" "enum_entries_source_platform" DEFAULT 'drive',
  	"access" "enum_entries_access" DEFAULT 'public',
  	"access_note" varchar,
  	"link_status" "enum_entries_link_status" DEFAULT 'unchecked',
  	"link_status_detail" varchar,
  	"last_checked" timestamp(3) with time zone,
  	"file_count" numeric,
  	"dominant_media" "enum_entries_dominant_media",
  	"media_mix_image" numeric,
  	"media_mix_video" numeric,
  	"media_mix_document" numeric,
  	"media_mix_audio" numeric,
  	"media_mix_vector" numeric,
  	"media_mix_other" numeric,
  	"orientation" "enum_entries_orientation",
  	"resolution_class" "enum_entries_resolution_class",
  	"folder_id" varchar,
  	"folder_path" varchar,
  	"raw_folder_name" varchar,
  	"duplicate_folders" numeric DEFAULT 1,
  	"import_disposition" "enum_entries_import_disposition",
  	"hold_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_entries_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "entries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "_entries_v_version_alternates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_entries_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_entries_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_url" varchar,
  	"version_rewritten_from" varchar,
  	"version_alt_text" varchar,
  	"version_kind" "enum__entries_v_version_kind",
  	"version_occasion" "enum__entries_v_version_occasion",
  	"version_film_id" integer,
  	"version_event_id" integer,
  	"version_location_id" integer,
  	"version_year" numeric,
  	"version_date_start" timestamp(3) with time zone,
  	"version_date_end" timestamp(3) with time zone,
  	"version_magazine_issue" numeric,
  	"version_minor_risk" "enum__entries_v_version_minor_risk" DEFAULT 'none',
  	"version_contains_minor" boolean DEFAULT false,
  	"version_contains_minor_confirmed" boolean DEFAULT false,
  	"version_safety_note" varchar,
  	"version_source_platform" "enum__entries_v_version_source_platform" DEFAULT 'drive',
  	"version_access" "enum__entries_v_version_access" DEFAULT 'public',
  	"version_access_note" varchar,
  	"version_link_status" "enum__entries_v_version_link_status" DEFAULT 'unchecked',
  	"version_link_status_detail" varchar,
  	"version_last_checked" timestamp(3) with time zone,
  	"version_file_count" numeric,
  	"version_dominant_media" "enum__entries_v_version_dominant_media",
  	"version_media_mix_image" numeric,
  	"version_media_mix_video" numeric,
  	"version_media_mix_document" numeric,
  	"version_media_mix_audio" numeric,
  	"version_media_mix_vector" numeric,
  	"version_media_mix_other" numeric,
  	"version_orientation" "enum__entries_v_version_orientation",
  	"version_resolution_class" "enum__entries_v_version_resolution_class",
  	"version_folder_id" varchar,
  	"version_folder_path" varchar,
  	"version_raw_folder_name" varchar,
  	"version_duplicate_folders" numeric DEFAULT 1,
  	"version_import_disposition" "enum__entries_v_version_import_disposition",
  	"version_hold_reason" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__entries_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_entries_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "pages_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"emphasis" "enum_pages_blocks_hero_actions_emphasis" DEFAULT 'primary'
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"media" "enum_pages_blocks_hero_media" DEFAULT 'none',
  	"media_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"width" "enum_pages_blocks_rich_text_width" DEFAULT 'prose',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_entry_query_filters_kind" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_entry_query_filters_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_entry_query_filters_occasion" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_entry_query_filters_occasion",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_entry_query" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"layout" "enum_pages_blocks_entry_query_layout" DEFAULT 'grid',
  	"limit" numeric DEFAULT 6,
  	"filters_brand_id" integer,
  	"filters_film_id" integer,
  	"filters_event_id" integer,
  	"filters_location_id" integer,
  	"filters_year" numeric,
  	"filters_exclude_minors" boolean DEFAULT false,
  	"sort" "enum_pages_blocks_entry_query_sort" DEFAULT '-fileCount',
  	"view_all" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_entry_picks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"layout" "enum_pages_blocks_entry_picks_layout" DEFAULT 'grid',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_lanes_lanes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"detail" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_lanes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"source" "enum_pages_blocks_stats_stats_source" DEFAULT 'manual'
  );
  
  CREATE TABLE "pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_film_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"show_watch_links" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_people_row" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"show_bios" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"attribution" varchar,
  	"source" varchar,
  	"source_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_copy_block_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_copy_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"url" varchar,
  	"aspect" "enum_pages_blocks_embed_aspect" DEFAULT '16-9',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_cta" (
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
  
  CREATE TABLE "pages_blocks_search_bar_scope_kind" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_search_bar_scope_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_search_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"placeholder" varchar DEFAULT 'Search the library',
  	"scope_brand_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"width" "enum_pages_blocks_columns_columns_width" DEFAULT 'equal',
  	"content" jsonb
  );
  
  CREATE TABLE "pages_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_divider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"spacing" "enum_pages_blocks_divider_spacing" DEFAULT 'medium',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_image" varchar,
  	"no_index" boolean DEFAULT false,
  	"seo_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"entries_id" integer,
  	"films_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"emphasis" "enum__pages_v_blocks_hero_actions_emphasis" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"media" "enum__pages_v_blocks_hero_media" DEFAULT 'none',
  	"media_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"width" "enum__pages_v_blocks_rich_text_width" DEFAULT 'prose',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_entry_query_filters_kind" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_entry_query_filters_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_entry_query_filters_occasion" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_entry_query_filters_occasion",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_entry_query" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"layout" "enum__pages_v_blocks_entry_query_layout" DEFAULT 'grid',
  	"limit" numeric DEFAULT 6,
  	"filters_brand_id" integer,
  	"filters_film_id" integer,
  	"filters_event_id" integer,
  	"filters_location_id" integer,
  	"filters_year" numeric,
  	"filters_exclude_minors" boolean DEFAULT false,
  	"sort" "enum__pages_v_blocks_entry_query_sort" DEFAULT '-fileCount',
  	"view_all" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_entry_picks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"layout" "enum__pages_v_blocks_entry_picks_layout" DEFAULT 'grid',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_lanes_lanes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"detail" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_lanes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"source" "enum__pages_v_blocks_stats_stats_source" DEFAULT 'manual',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"show_watch_links" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_people_row" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"show_bios" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"attribution" varchar,
  	"source" varchar,
  	"source_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_copy_block_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_copy_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"url" varchar,
  	"aspect" "enum__pages_v_blocks_embed_aspect" DEFAULT '16-9',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
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
  
  CREATE TABLE "_pages_v_blocks_search_bar_scope_kind" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_search_bar_scope_kind",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_search_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"placeholder" varchar DEFAULT 'Search the library',
  	"scope_brand_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"width" "enum__pages_v_blocks_columns_columns_width" DEFAULT 'equal',
  	"content" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_divider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"spacing" "enum__pages_v_blocks_divider_spacing" DEFAULT 'medium',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_image" varchar,
  	"version_no_index" boolean DEFAULT false,
  	"version_seo_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"entries_id" integer,
  	"films_id" integer
  );
  
  CREATE TABLE "site_settings_nav_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"label" varchar NOT NULL,
  	"footer_blurb" varchar,
  	"footer_trademark_note" varchar,
  	"search_placeholder" varchar DEFAULT 'Search films, people, events and collections',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"role" varchar,
  	"bio" varchar,
  	"is_family" boolean DEFAULT false,
  	"is_minor" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "films_watch" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"free" boolean DEFAULT false
  );
  
  CREATE TABLE "films" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"synopsis" varchar,
  	"awards" numeric DEFAULT 0,
  	"year" numeric,
  	"status" "enum_films_status" DEFAULT 'released',
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"summary" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"location_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "entries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_settings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "people_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "films_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "locations_id" integer;
  ALTER TABLE "entries_alternates" ADD CONSTRAINT "entries_alternates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_tags" ADD CONSTRAINT "entries_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "entries_rels" ADD CONSTRAINT "entries_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_version_alternates" ADD CONSTRAINT "_entries_v_version_alternates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_version_tags" ADD CONSTRAINT "_entries_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_parent_id_entries_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_tenant_id_brands_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_film_id_films_id_fk" FOREIGN KEY ("version_film_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_location_id_locations_id_fk" FOREIGN KEY ("version_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_entries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_entries_v_rels" ADD CONSTRAINT "_entries_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_actions" ADD CONSTRAINT "pages_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query_filters_kind" ADD CONSTRAINT "pages_blocks_entry_query_filters_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query_filters_occasion" ADD CONSTRAINT "pages_blocks_entry_query_filters_occasion_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query" ADD CONSTRAINT "pages_blocks_entry_query_filters_brand_id_brands_id_fk" FOREIGN KEY ("filters_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query" ADD CONSTRAINT "pages_blocks_entry_query_filters_film_id_films_id_fk" FOREIGN KEY ("filters_film_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query" ADD CONSTRAINT "pages_blocks_entry_query_filters_event_id_events_id_fk" FOREIGN KEY ("filters_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query" ADD CONSTRAINT "pages_blocks_entry_query_filters_location_id_locations_id_fk" FOREIGN KEY ("filters_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_query" ADD CONSTRAINT "pages_blocks_entry_query_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_entry_picks" ADD CONSTRAINT "pages_blocks_entry_picks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_lanes_lanes" ADD CONSTRAINT "pages_blocks_lanes_lanes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_lanes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_lanes" ADD CONSTRAINT "pages_blocks_lanes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats_stats" ADD CONSTRAINT "pages_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip" ADD CONSTRAINT "pages_blocks_film_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row" ADD CONSTRAINT "pages_blocks_people_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote" ADD CONSTRAINT "pages_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_copy_block_variants" ADD CONSTRAINT "pages_blocks_copy_block_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_copy_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_copy_block" ADD CONSTRAINT "pages_blocks_copy_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_embed" ADD CONSTRAINT "pages_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_actions" ADD CONSTRAINT "pages_blocks_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_bar_scope_kind" ADD CONSTRAINT "pages_blocks_search_bar_scope_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages_blocks_search_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_bar" ADD CONSTRAINT "pages_blocks_search_bar_scope_brand_id_brands_id_fk" FOREIGN KEY ("scope_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_search_bar" ADD CONSTRAINT "pages_blocks_search_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_columns_columns" ADD CONSTRAINT "pages_blocks_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_columns" ADD CONSTRAINT "pages_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_divider" ADD CONSTRAINT "pages_blocks_divider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_actions" ADD CONSTRAINT "_pages_v_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query_filters_kind" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query_filters_occasion" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_occasion_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_entry_query"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_brand_id_brands_id_fk" FOREIGN KEY ("filters_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_film_id_films_id_fk" FOREIGN KEY ("filters_film_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_event_id_events_id_fk" FOREIGN KEY ("filters_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query" ADD CONSTRAINT "_pages_v_blocks_entry_query_filters_location_id_locations_id_fk" FOREIGN KEY ("filters_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_query" ADD CONSTRAINT "_pages_v_blocks_entry_query_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entry_picks" ADD CONSTRAINT "_pages_v_blocks_entry_picks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_lanes_lanes" ADD CONSTRAINT "_pages_v_blocks_lanes_lanes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_lanes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_lanes" ADD CONSTRAINT "_pages_v_blocks_lanes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats_stats" ADD CONSTRAINT "_pages_v_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip" ADD CONSTRAINT "_pages_v_blocks_film_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row" ADD CONSTRAINT "_pages_v_blocks_people_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote" ADD CONSTRAINT "_pages_v_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_copy_block_variants" ADD CONSTRAINT "_pages_v_blocks_copy_block_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_copy_block"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_copy_block" ADD CONSTRAINT "_pages_v_blocks_copy_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_embed" ADD CONSTRAINT "_pages_v_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_actions" ADD CONSTRAINT "_pages_v_blocks_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_bar_scope_kind" ADD CONSTRAINT "_pages_v_blocks_search_bar_scope_kind_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v_blocks_search_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_bar" ADD CONSTRAINT "_pages_v_blocks_search_bar_scope_brand_id_brands_id_fk" FOREIGN KEY ("scope_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_search_bar" ADD CONSTRAINT "_pages_v_blocks_search_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_columns_columns" ADD CONSTRAINT "_pages_v_blocks_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_columns" ADD CONSTRAINT "_pages_v_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_divider" ADD CONSTRAINT "_pages_v_blocks_divider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_tenant_id_brands_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_nav_children" ADD CONSTRAINT "site_settings_nav_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_nav"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_nav" ADD CONSTRAINT "site_settings_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_links" ADD CONSTRAINT "site_settings_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_brands_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "films_watch" ADD CONSTRAINT "films_watch_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "entries_alternates_order_idx" ON "entries_alternates" USING btree ("_order");
  CREATE INDEX "entries_alternates_parent_id_idx" ON "entries_alternates" USING btree ("_parent_id");
  CREATE INDEX "entries_tags_order_idx" ON "entries_tags" USING btree ("_order");
  CREATE INDEX "entries_tags_parent_id_idx" ON "entries_tags" USING btree ("_parent_id");
  CREATE INDEX "entries_tenant_idx" ON "entries" USING btree ("tenant_id");
  CREATE INDEX "entries_url_idx" ON "entries" USING btree ("url");
  CREATE INDEX "entries_kind_idx" ON "entries" USING btree ("kind");
  CREATE INDEX "entries_occasion_idx" ON "entries" USING btree ("occasion");
  CREATE INDEX "entries_film_idx" ON "entries" USING btree ("film_id");
  CREATE INDEX "entries_event_idx" ON "entries" USING btree ("event_id");
  CREATE INDEX "entries_location_idx" ON "entries" USING btree ("location_id");
  CREATE INDEX "entries_year_idx" ON "entries" USING btree ("year");
  CREATE INDEX "entries_magazine_issue_idx" ON "entries" USING btree ("magazine_issue");
  CREATE INDEX "entries_minor_risk_idx" ON "entries" USING btree ("minor_risk");
  CREATE INDEX "entries_contains_minor_idx" ON "entries" USING btree ("contains_minor");
  CREATE INDEX "entries_source_platform_idx" ON "entries" USING btree ("source_platform");
  CREATE INDEX "entries_access_idx" ON "entries" USING btree ("access");
  CREATE INDEX "entries_link_status_idx" ON "entries" USING btree ("link_status");
  CREATE INDEX "entries_updated_at_idx" ON "entries" USING btree ("updated_at");
  CREATE INDEX "entries_created_at_idx" ON "entries" USING btree ("created_at");
  CREATE INDEX "entries__status_idx" ON "entries" USING btree ("_status");
  CREATE INDEX "entries_rels_order_idx" ON "entries_rels" USING btree ("order");
  CREATE INDEX "entries_rels_parent_idx" ON "entries_rels" USING btree ("parent_id");
  CREATE INDEX "entries_rels_path_idx" ON "entries_rels" USING btree ("path");
  CREATE INDEX "entries_rels_people_id_idx" ON "entries_rels" USING btree ("people_id");
  CREATE INDEX "_entries_v_version_alternates_order_idx" ON "_entries_v_version_alternates" USING btree ("_order");
  CREATE INDEX "_entries_v_version_alternates_parent_id_idx" ON "_entries_v_version_alternates" USING btree ("_parent_id");
  CREATE INDEX "_entries_v_version_tags_order_idx" ON "_entries_v_version_tags" USING btree ("_order");
  CREATE INDEX "_entries_v_version_tags_parent_id_idx" ON "_entries_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_entries_v_parent_idx" ON "_entries_v" USING btree ("parent_id");
  CREATE INDEX "_entries_v_version_version_tenant_idx" ON "_entries_v" USING btree ("version_tenant_id");
  CREATE INDEX "_entries_v_version_version_url_idx" ON "_entries_v" USING btree ("version_url");
  CREATE INDEX "_entries_v_version_version_kind_idx" ON "_entries_v" USING btree ("version_kind");
  CREATE INDEX "_entries_v_version_version_occasion_idx" ON "_entries_v" USING btree ("version_occasion");
  CREATE INDEX "_entries_v_version_version_film_idx" ON "_entries_v" USING btree ("version_film_id");
  CREATE INDEX "_entries_v_version_version_event_idx" ON "_entries_v" USING btree ("version_event_id");
  CREATE INDEX "_entries_v_version_version_location_idx" ON "_entries_v" USING btree ("version_location_id");
  CREATE INDEX "_entries_v_version_version_year_idx" ON "_entries_v" USING btree ("version_year");
  CREATE INDEX "_entries_v_version_version_magazine_issue_idx" ON "_entries_v" USING btree ("version_magazine_issue");
  CREATE INDEX "_entries_v_version_version_minor_risk_idx" ON "_entries_v" USING btree ("version_minor_risk");
  CREATE INDEX "_entries_v_version_version_contains_minor_idx" ON "_entries_v" USING btree ("version_contains_minor");
  CREATE INDEX "_entries_v_version_version_source_platform_idx" ON "_entries_v" USING btree ("version_source_platform");
  CREATE INDEX "_entries_v_version_version_access_idx" ON "_entries_v" USING btree ("version_access");
  CREATE INDEX "_entries_v_version_version_link_status_idx" ON "_entries_v" USING btree ("version_link_status");
  CREATE INDEX "_entries_v_version_version_updated_at_idx" ON "_entries_v" USING btree ("version_updated_at");
  CREATE INDEX "_entries_v_version_version_created_at_idx" ON "_entries_v" USING btree ("version_created_at");
  CREATE INDEX "_entries_v_version_version__status_idx" ON "_entries_v" USING btree ("version__status");
  CREATE INDEX "_entries_v_created_at_idx" ON "_entries_v" USING btree ("created_at");
  CREATE INDEX "_entries_v_updated_at_idx" ON "_entries_v" USING btree ("updated_at");
  CREATE INDEX "_entries_v_latest_idx" ON "_entries_v" USING btree ("latest");
  CREATE INDEX "_entries_v_rels_order_idx" ON "_entries_v_rels" USING btree ("order");
  CREATE INDEX "_entries_v_rels_parent_idx" ON "_entries_v_rels" USING btree ("parent_id");
  CREATE INDEX "_entries_v_rels_path_idx" ON "_entries_v_rels" USING btree ("path");
  CREATE INDEX "_entries_v_rels_people_id_idx" ON "_entries_v_rels" USING btree ("people_id");
  CREATE INDEX "pages_blocks_hero_actions_order_idx" ON "pages_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_actions_parent_id_idx" ON "pages_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_entry_query_filters_kind_order_idx" ON "pages_blocks_entry_query_filters_kind" USING btree ("order");
  CREATE INDEX "pages_blocks_entry_query_filters_kind_parent_idx" ON "pages_blocks_entry_query_filters_kind" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_entry_query_filters_occasion_order_idx" ON "pages_blocks_entry_query_filters_occasion" USING btree ("order");
  CREATE INDEX "pages_blocks_entry_query_filters_occasion_parent_idx" ON "pages_blocks_entry_query_filters_occasion" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_entry_query_order_idx" ON "pages_blocks_entry_query" USING btree ("_order");
  CREATE INDEX "pages_blocks_entry_query_parent_id_idx" ON "pages_blocks_entry_query" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_entry_query_path_idx" ON "pages_blocks_entry_query" USING btree ("_path");
  CREATE INDEX "pages_blocks_entry_query_filters_filters_brand_idx" ON "pages_blocks_entry_query" USING btree ("filters_brand_id");
  CREATE INDEX "pages_blocks_entry_query_filters_filters_film_idx" ON "pages_blocks_entry_query" USING btree ("filters_film_id");
  CREATE INDEX "pages_blocks_entry_query_filters_filters_event_idx" ON "pages_blocks_entry_query" USING btree ("filters_event_id");
  CREATE INDEX "pages_blocks_entry_query_filters_filters_location_idx" ON "pages_blocks_entry_query" USING btree ("filters_location_id");
  CREATE INDEX "pages_blocks_entry_picks_order_idx" ON "pages_blocks_entry_picks" USING btree ("_order");
  CREATE INDEX "pages_blocks_entry_picks_parent_id_idx" ON "pages_blocks_entry_picks" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_entry_picks_path_idx" ON "pages_blocks_entry_picks" USING btree ("_path");
  CREATE INDEX "pages_blocks_lanes_lanes_order_idx" ON "pages_blocks_lanes_lanes" USING btree ("_order");
  CREATE INDEX "pages_blocks_lanes_lanes_parent_id_idx" ON "pages_blocks_lanes_lanes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_lanes_order_idx" ON "pages_blocks_lanes" USING btree ("_order");
  CREATE INDEX "pages_blocks_lanes_parent_id_idx" ON "pages_blocks_lanes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_lanes_path_idx" ON "pages_blocks_lanes" USING btree ("_path");
  CREATE INDEX "pages_blocks_stats_stats_order_idx" ON "pages_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_stats_parent_id_idx" ON "pages_blocks_stats_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_film_strip_order_idx" ON "pages_blocks_film_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_strip_parent_id_idx" ON "pages_blocks_film_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_strip_path_idx" ON "pages_blocks_film_strip" USING btree ("_path");
  CREATE INDEX "pages_blocks_people_row_order_idx" ON "pages_blocks_people_row" USING btree ("_order");
  CREATE INDEX "pages_blocks_people_row_parent_id_idx" ON "pages_blocks_people_row" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_people_row_path_idx" ON "pages_blocks_people_row" USING btree ("_path");
  CREATE INDEX "pages_blocks_quote_order_idx" ON "pages_blocks_quote" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_parent_id_idx" ON "pages_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_path_idx" ON "pages_blocks_quote" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_copy_block_variants_order_idx" ON "pages_blocks_copy_block_variants" USING btree ("_order");
  CREATE INDEX "pages_blocks_copy_block_variants_parent_id_idx" ON "pages_blocks_copy_block_variants" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_copy_block_order_idx" ON "pages_blocks_copy_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_copy_block_parent_id_idx" ON "pages_blocks_copy_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_copy_block_path_idx" ON "pages_blocks_copy_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_embed_order_idx" ON "pages_blocks_embed" USING btree ("_order");
  CREATE INDEX "pages_blocks_embed_parent_id_idx" ON "pages_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_embed_path_idx" ON "pages_blocks_embed" USING btree ("_path");
  CREATE INDEX "pages_blocks_cta_actions_order_idx" ON "pages_blocks_cta_actions" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_actions_parent_id_idx" ON "pages_blocks_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE INDEX "pages_blocks_search_bar_scope_kind_order_idx" ON "pages_blocks_search_bar_scope_kind" USING btree ("order");
  CREATE INDEX "pages_blocks_search_bar_scope_kind_parent_idx" ON "pages_blocks_search_bar_scope_kind" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_search_bar_order_idx" ON "pages_blocks_search_bar" USING btree ("_order");
  CREATE INDEX "pages_blocks_search_bar_parent_id_idx" ON "pages_blocks_search_bar" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_search_bar_path_idx" ON "pages_blocks_search_bar" USING btree ("_path");
  CREATE INDEX "pages_blocks_search_bar_scope_scope_brand_idx" ON "pages_blocks_search_bar" USING btree ("scope_brand_id");
  CREATE INDEX "pages_blocks_columns_columns_order_idx" ON "pages_blocks_columns_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_columns_parent_id_idx" ON "pages_blocks_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_order_idx" ON "pages_blocks_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_parent_id_idx" ON "pages_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_path_idx" ON "pages_blocks_columns" USING btree ("_path");
  CREATE INDEX "pages_blocks_divider_order_idx" ON "pages_blocks_divider" USING btree ("_order");
  CREATE INDEX "pages_blocks_divider_parent_id_idx" ON "pages_blocks_divider" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_divider_path_idx" ON "pages_blocks_divider" USING btree ("_path");
  CREATE INDEX "pages_tenant_idx" ON "pages" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_people_id_idx" ON "pages_rels" USING btree ("people_id");
  CREATE INDEX "pages_rels_entries_id_idx" ON "pages_rels" USING btree ("entries_id");
  CREATE INDEX "pages_rels_films_id_idx" ON "pages_rels" USING btree ("films_id");
  CREATE INDEX "_pages_v_blocks_hero_actions_order_idx" ON "_pages_v_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_actions_parent_id_idx" ON "_pages_v_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_kind_order_idx" ON "_pages_v_blocks_entry_query_filters_kind" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_kind_parent_idx" ON "_pages_v_blocks_entry_query_filters_kind" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_occasion_order_idx" ON "_pages_v_blocks_entry_query_filters_occasion" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_occasion_parent_idx" ON "_pages_v_blocks_entry_query_filters_occasion" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_entry_query_order_idx" ON "_pages_v_blocks_entry_query" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_entry_query_parent_id_idx" ON "_pages_v_blocks_entry_query" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_entry_query_path_idx" ON "_pages_v_blocks_entry_query" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_filters_brand_idx" ON "_pages_v_blocks_entry_query" USING btree ("filters_brand_id");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_filters_film_idx" ON "_pages_v_blocks_entry_query" USING btree ("filters_film_id");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_filters_event_idx" ON "_pages_v_blocks_entry_query" USING btree ("filters_event_id");
  CREATE INDEX "_pages_v_blocks_entry_query_filters_filters_location_idx" ON "_pages_v_blocks_entry_query" USING btree ("filters_location_id");
  CREATE INDEX "_pages_v_blocks_entry_picks_order_idx" ON "_pages_v_blocks_entry_picks" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_entry_picks_parent_id_idx" ON "_pages_v_blocks_entry_picks" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_entry_picks_path_idx" ON "_pages_v_blocks_entry_picks" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_lanes_lanes_order_idx" ON "_pages_v_blocks_lanes_lanes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_lanes_lanes_parent_id_idx" ON "_pages_v_blocks_lanes_lanes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_lanes_order_idx" ON "_pages_v_blocks_lanes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_lanes_parent_id_idx" ON "_pages_v_blocks_lanes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_lanes_path_idx" ON "_pages_v_blocks_lanes" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_stats_stats_order_idx" ON "_pages_v_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_stats_parent_id_idx" ON "_pages_v_blocks_stats_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_film_strip_order_idx" ON "_pages_v_blocks_film_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_strip_parent_id_idx" ON "_pages_v_blocks_film_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_strip_path_idx" ON "_pages_v_blocks_film_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_people_row_order_idx" ON "_pages_v_blocks_people_row" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_people_row_parent_id_idx" ON "_pages_v_blocks_people_row" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_people_row_path_idx" ON "_pages_v_blocks_people_row" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_quote_order_idx" ON "_pages_v_blocks_quote" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_parent_id_idx" ON "_pages_v_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_path_idx" ON "_pages_v_blocks_quote" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_copy_block_variants_order_idx" ON "_pages_v_blocks_copy_block_variants" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_copy_block_variants_parent_id_idx" ON "_pages_v_blocks_copy_block_variants" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_copy_block_order_idx" ON "_pages_v_blocks_copy_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_copy_block_parent_id_idx" ON "_pages_v_blocks_copy_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_copy_block_path_idx" ON "_pages_v_blocks_copy_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_embed_order_idx" ON "_pages_v_blocks_embed" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_embed_parent_id_idx" ON "_pages_v_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_embed_path_idx" ON "_pages_v_blocks_embed" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cta_actions_order_idx" ON "_pages_v_blocks_cta_actions" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_actions_parent_id_idx" ON "_pages_v_blocks_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_search_bar_scope_kind_order_idx" ON "_pages_v_blocks_search_bar_scope_kind" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_search_bar_scope_kind_parent_idx" ON "_pages_v_blocks_search_bar_scope_kind" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_search_bar_order_idx" ON "_pages_v_blocks_search_bar" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_search_bar_parent_id_idx" ON "_pages_v_blocks_search_bar" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_search_bar_path_idx" ON "_pages_v_blocks_search_bar" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_search_bar_scope_scope_brand_idx" ON "_pages_v_blocks_search_bar" USING btree ("scope_brand_id");
  CREATE INDEX "_pages_v_blocks_columns_columns_order_idx" ON "_pages_v_blocks_columns_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_columns_columns_parent_id_idx" ON "_pages_v_blocks_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_columns_order_idx" ON "_pages_v_blocks_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_columns_parent_id_idx" ON "_pages_v_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_columns_path_idx" ON "_pages_v_blocks_columns" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_divider_order_idx" ON "_pages_v_blocks_divider" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_divider_parent_id_idx" ON "_pages_v_blocks_divider" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_divider_path_idx" ON "_pages_v_blocks_divider" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_tenant_idx" ON "_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_people_id_idx" ON "_pages_v_rels" USING btree ("people_id");
  CREATE INDEX "_pages_v_rels_entries_id_idx" ON "_pages_v_rels" USING btree ("entries_id");
  CREATE INDEX "_pages_v_rels_films_id_idx" ON "_pages_v_rels" USING btree ("films_id");
  CREATE INDEX "site_settings_nav_children_order_idx" ON "site_settings_nav_children" USING btree ("_order");
  CREATE INDEX "site_settings_nav_children_parent_id_idx" ON "site_settings_nav_children" USING btree ("_parent_id");
  CREATE INDEX "site_settings_nav_order_idx" ON "site_settings_nav" USING btree ("_order");
  CREATE INDEX "site_settings_nav_parent_id_idx" ON "site_settings_nav" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_links_order_idx" ON "site_settings_footer_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_links_parent_id_idx" ON "site_settings_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_tenant_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE INDEX "films_watch_order_idx" ON "films_watch" USING btree ("_order");
  CREATE INDEX "films_watch_parent_id_idx" ON "films_watch" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "films_slug_idx" ON "films" USING btree ("slug");
  CREATE INDEX "films_updated_at_idx" ON "films" USING btree ("updated_at");
  CREATE INDEX "films_created_at_idx" ON "films" USING btree ("created_at");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_location_idx" ON "events" USING btree ("location_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE UNIQUE INDEX "locations_slug_idx" ON "locations" USING btree ("slug");
  CREATE INDEX "locations_updated_at_idx" ON "locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "locations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_entries_fk" FOREIGN KEY ("entries_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_films_fk" FOREIGN KEY ("films_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("entries_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_films_id_idx" ON "payload_locked_documents_rels" USING btree ("films_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("locations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries_alternates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "entries_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "entries_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_entries_v_version_alternates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_entries_v_version_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_entries_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_entries_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_entry_query_filters_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_entry_query_filters_occasion" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_entry_query" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_entry_picks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_lanes_lanes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_lanes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_film_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_people_row" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_copy_block_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_copy_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cta_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_search_bar_scope_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_search_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_columns_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_divider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entry_query_filters_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entry_query_filters_occasion" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entry_query" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entry_picks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_lanes_lanes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_lanes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_film_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_people_row" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_copy_block_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_copy_block" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cta_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_search_bar_scope_kind" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_search_bar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_columns_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_divider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_nav_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_nav" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_footer_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "films_watch" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "films" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "locations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "entries_alternates" CASCADE;
  DROP TABLE "entries_tags" CASCADE;
  DROP TABLE "entries" CASCADE;
  DROP TABLE "entries_rels" CASCADE;
  DROP TABLE "_entries_v_version_alternates" CASCADE;
  DROP TABLE "_entries_v_version_tags" CASCADE;
  DROP TABLE "_entries_v" CASCADE;
  DROP TABLE "_entries_v_rels" CASCADE;
  DROP TABLE "pages_blocks_hero_actions" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_entry_query_filters_kind" CASCADE;
  DROP TABLE "pages_blocks_entry_query_filters_occasion" CASCADE;
  DROP TABLE "pages_blocks_entry_query" CASCADE;
  DROP TABLE "pages_blocks_entry_picks" CASCADE;
  DROP TABLE "pages_blocks_lanes_lanes" CASCADE;
  DROP TABLE "pages_blocks_lanes" CASCADE;
  DROP TABLE "pages_blocks_stats_stats" CASCADE;
  DROP TABLE "pages_blocks_stats" CASCADE;
  DROP TABLE "pages_blocks_film_strip" CASCADE;
  DROP TABLE "pages_blocks_people_row" CASCADE;
  DROP TABLE "pages_blocks_quote" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_copy_block_variants" CASCADE;
  DROP TABLE "pages_blocks_copy_block" CASCADE;
  DROP TABLE "pages_blocks_embed" CASCADE;
  DROP TABLE "pages_blocks_cta_actions" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages_blocks_search_bar_scope_kind" CASCADE;
  DROP TABLE "pages_blocks_search_bar" CASCADE;
  DROP TABLE "pages_blocks_columns_columns" CASCADE;
  DROP TABLE "pages_blocks_columns" CASCADE;
  DROP TABLE "pages_blocks_divider" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_actions" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_entry_query_filters_kind" CASCADE;
  DROP TABLE "_pages_v_blocks_entry_query_filters_occasion" CASCADE;
  DROP TABLE "_pages_v_blocks_entry_query" CASCADE;
  DROP TABLE "_pages_v_blocks_entry_picks" CASCADE;
  DROP TABLE "_pages_v_blocks_lanes_lanes" CASCADE;
  DROP TABLE "_pages_v_blocks_lanes" CASCADE;
  DROP TABLE "_pages_v_blocks_stats_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_film_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_people_row" CASCADE;
  DROP TABLE "_pages_v_blocks_quote" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_copy_block_variants" CASCADE;
  DROP TABLE "_pages_v_blocks_copy_block" CASCADE;
  DROP TABLE "_pages_v_blocks_embed" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_actions" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v_blocks_search_bar_scope_kind" CASCADE;
  DROP TABLE "_pages_v_blocks_search_bar" CASCADE;
  DROP TABLE "_pages_v_blocks_columns_columns" CASCADE;
  DROP TABLE "_pages_v_blocks_columns" CASCADE;
  DROP TABLE "_pages_v_blocks_divider" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "site_settings_nav_children" CASCADE;
  DROP TABLE "site_settings_nav" CASCADE;
  DROP TABLE "site_settings_footer_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "films_watch" CASCADE;
  DROP TABLE "films" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "locations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_entries_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_site_settings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_people_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_films_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_locations_fk";
  
  DROP INDEX "payload_locked_documents_rels_entries_id_idx";
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_site_settings_id_idx";
  DROP INDEX "payload_locked_documents_rels_people_id_idx";
  DROP INDEX "payload_locked_documents_rels_films_id_idx";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_locations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "entries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "site_settings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "people_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "films_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "locations_id";
  DROP TYPE "public"."enum_entries_kind";
  DROP TYPE "public"."enum_entries_occasion";
  DROP TYPE "public"."enum_entries_minor_risk";
  DROP TYPE "public"."enum_entries_source_platform";
  DROP TYPE "public"."enum_entries_access";
  DROP TYPE "public"."enum_entries_link_status";
  DROP TYPE "public"."enum_entries_dominant_media";
  DROP TYPE "public"."enum_entries_orientation";
  DROP TYPE "public"."enum_entries_resolution_class";
  DROP TYPE "public"."enum_entries_import_disposition";
  DROP TYPE "public"."enum_entries_status";
  DROP TYPE "public"."enum__entries_v_version_kind";
  DROP TYPE "public"."enum__entries_v_version_occasion";
  DROP TYPE "public"."enum__entries_v_version_minor_risk";
  DROP TYPE "public"."enum__entries_v_version_source_platform";
  DROP TYPE "public"."enum__entries_v_version_access";
  DROP TYPE "public"."enum__entries_v_version_link_status";
  DROP TYPE "public"."enum__entries_v_version_dominant_media";
  DROP TYPE "public"."enum__entries_v_version_orientation";
  DROP TYPE "public"."enum__entries_v_version_resolution_class";
  DROP TYPE "public"."enum__entries_v_version_import_disposition";
  DROP TYPE "public"."enum__entries_v_version_status";
  DROP TYPE "public"."enum_pages_blocks_hero_actions_emphasis";
  DROP TYPE "public"."enum_pages_blocks_hero_media";
  DROP TYPE "public"."enum_pages_blocks_rich_text_width";
  DROP TYPE "public"."enum_pages_blocks_entry_query_filters_kind";
  DROP TYPE "public"."enum_pages_blocks_entry_query_filters_occasion";
  DROP TYPE "public"."enum_pages_blocks_entry_query_layout";
  DROP TYPE "public"."enum_pages_blocks_entry_query_sort";
  DROP TYPE "public"."enum_pages_blocks_entry_picks_layout";
  DROP TYPE "public"."enum_pages_blocks_stats_stats_source";
  DROP TYPE "public"."enum_pages_blocks_embed_aspect";
  DROP TYPE "public"."enum_pages_blocks_search_bar_scope_kind";
  DROP TYPE "public"."enum_pages_blocks_columns_columns_width";
  DROP TYPE "public"."enum_pages_blocks_divider_spacing";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_hero_actions_emphasis";
  DROP TYPE "public"."enum__pages_v_blocks_hero_media";
  DROP TYPE "public"."enum__pages_v_blocks_rich_text_width";
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_filters_kind";
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion";
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_layout";
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_sort";
  DROP TYPE "public"."enum__pages_v_blocks_entry_picks_layout";
  DROP TYPE "public"."enum__pages_v_blocks_stats_stats_source";
  DROP TYPE "public"."enum__pages_v_blocks_embed_aspect";
  DROP TYPE "public"."enum__pages_v_blocks_search_bar_scope_kind";
  DROP TYPE "public"."enum__pages_v_blocks_columns_columns_width";
  DROP TYPE "public"."enum__pages_v_blocks_divider_spacing";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_films_status";`)
}
