import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_landing_assets_used_for" AS ENUM('hero', 'statement', 'people', 'films', 'press', 'lately', 'other');
  CREATE TABLE "landing_assets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"used_for" "enum_landing_assets_used_for",
  	"alt" varchar,
  	"credit" varchar,
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
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_wide_url" varchar,
  	"sizes_wide_width" numeric,
  	"sizes_wide_height" numeric,
  	"sizes_wide_mime_type" varchar,
  	"sizes_wide_filesize" numeric,
  	"sizes_wide_filename" varchar
  );
  
  ALTER TABLE "pages_blocks_deck_hero_cards" DROP CONSTRAINT "pages_blocks_deck_hero_cards_image_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_statement_split_pictures" DROP CONSTRAINT "pages_blocks_statement_split_pictures_image_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_film_strip_items" DROP CONSTRAINT "pages_blocks_film_strip_items_image_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_people_row_cards" DROP CONSTRAINT "pages_blocks_people_row_cards_image_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_press_list_items" DROP CONSTRAINT "pages_blocks_press_list_items_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" DROP CONSTRAINT "_pages_v_blocks_deck_hero_cards_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" DROP CONSTRAINT "_pages_v_blocks_statement_split_pictures_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_film_strip_items" DROP CONSTRAINT "_pages_v_blocks_film_strip_items_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_people_row_cards" DROP CONSTRAINT "_pages_v_blocks_people_row_cards_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_press_list_items" DROP CONSTRAINT "_pages_v_blocks_press_list_items_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "landing_assets_id" integer;
  CREATE INDEX "landing_assets_updated_at_idx" ON "landing_assets" USING btree ("updated_at");
  CREATE INDEX "landing_assets_created_at_idx" ON "landing_assets" USING btree ("created_at");
  CREATE UNIQUE INDEX "landing_assets_filename_idx" ON "landing_assets" USING btree ("filename");
  CREATE INDEX "landing_assets_sizes_card_sizes_card_filename_idx" ON "landing_assets" USING btree ("sizes_card_filename");
  CREATE INDEX "landing_assets_sizes_wide_sizes_wide_filename_idx" ON "landing_assets" USING btree ("sizes_wide_filename");
  ALTER TABLE "pages_blocks_deck_hero_cards" ADD CONSTRAINT "pages_blocks_deck_hero_cards_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split_pictures" ADD CONSTRAINT "pages_blocks_statement_split_pictures_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items" ADD CONSTRAINT "pages_blocks_film_strip_items_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row_cards" ADD CONSTRAINT "pages_blocks_people_row_cards_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list_items" ADD CONSTRAINT "pages_blocks_press_list_items_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" ADD CONSTRAINT "_pages_v_blocks_deck_hero_cards_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" ADD CONSTRAINT "_pages_v_blocks_statement_split_pictures_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row_cards" ADD CONSTRAINT "_pages_v_blocks_people_row_cards_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list_items" ADD CONSTRAINT "_pages_v_blocks_press_list_items_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_landing_assets_fk" FOREIGN KEY ("landing_assets_id") REFERENCES "public"."landing_assets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_landing_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("landing_assets_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "landing_assets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "landing_assets" CASCADE;
  ALTER TABLE "pages_blocks_deck_hero_cards" DROP CONSTRAINT "pages_blocks_deck_hero_cards_image_id_landing_assets_id_fk";
  
  ALTER TABLE "pages_blocks_statement_split_pictures" DROP CONSTRAINT "pages_blocks_statement_split_pictures_image_id_landing_assets_id_fk";
  
  ALTER TABLE "pages_blocks_film_strip_items" DROP CONSTRAINT "pages_blocks_film_strip_items_image_id_landing_assets_id_fk";
  
  ALTER TABLE "pages_blocks_people_row_cards" DROP CONSTRAINT "pages_blocks_people_row_cards_image_id_landing_assets_id_fk";
  
  ALTER TABLE "pages_blocks_press_list_items" DROP CONSTRAINT "pages_blocks_press_list_items_image_id_landing_assets_id_fk";
  
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" DROP CONSTRAINT "_pages_v_blocks_deck_hero_cards_image_id_landing_assets_id_fk";
  
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" DROP CONSTRAINT "_pages_v_blocks_statement_split_pictures_image_id_landing_assets_id_fk";
  
  ALTER TABLE "_pages_v_blocks_film_strip_items" DROP CONSTRAINT "_pages_v_blocks_film_strip_items_image_id_landing_assets_id_fk";
  
  ALTER TABLE "_pages_v_blocks_people_row_cards" DROP CONSTRAINT "_pages_v_blocks_people_row_cards_image_id_landing_assets_id_fk";
  
  ALTER TABLE "_pages_v_blocks_press_list_items" DROP CONSTRAINT "_pages_v_blocks_press_list_items_image_id_landing_assets_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_landing_assets_fk";
  
  DROP INDEX "payload_locked_documents_rels_landing_assets_id_idx";
  ALTER TABLE "pages_blocks_deck_hero_cards" ADD CONSTRAINT "pages_blocks_deck_hero_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split_pictures" ADD CONSTRAINT "pages_blocks_statement_split_pictures_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items" ADD CONSTRAINT "pages_blocks_film_strip_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row_cards" ADD CONSTRAINT "pages_blocks_people_row_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list_items" ADD CONSTRAINT "pages_blocks_press_list_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" ADD CONSTRAINT "_pages_v_blocks_deck_hero_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" ADD CONSTRAINT "_pages_v_blocks_statement_split_pictures_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row_cards" ADD CONSTRAINT "_pages_v_blocks_people_row_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list_items" ADD CONSTRAINT "_pages_v_blocks_press_list_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "landing_assets_id";
  DROP TYPE "public"."enum_landing_assets_used_for";`)
}
