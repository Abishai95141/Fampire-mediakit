import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_deck_hero_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar,
  	"caption" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_brand_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"label" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_film_strip_items_watch" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"free" boolean
  );
  
  CREATE TABLE "pages_blocks_film_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"title" varchar,
  	"synopsis" varchar,
  	"year" numeric,
  	"awards" numeric,
  	"status" varchar
  );
  
  CREATE TABLE "pages_blocks_people_row_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_press_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"title" varchar,
  	"outlet" varchar,
  	"when" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_deck_hero_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar,
  	"caption" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_brand_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"label" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_strip_items_watch" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" varchar,
  	"url" varchar,
  	"free" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_film_strip_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"title" varchar,
  	"synopsis" varchar,
  	"year" numeric,
  	"awards" numeric,
  	"status" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_people_row_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_press_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"title" varchar,
  	"outlet" varchar,
  	"when" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_deck_hero_cards" ADD CONSTRAINT "pages_blocks_deck_hero_cards_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_deck_hero_cards" ADD CONSTRAINT "pages_blocks_deck_hero_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_deck_hero_cards" ADD CONSTRAINT "pages_blocks_deck_hero_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_deck_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_brand_strip_items" ADD CONSTRAINT "pages_blocks_brand_strip_items_source_id_brands_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_brand_strip_items" ADD CONSTRAINT "pages_blocks_brand_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_brand_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items_watch" ADD CONSTRAINT "pages_blocks_film_strip_items_watch_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_film_strip_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items" ADD CONSTRAINT "pages_blocks_film_strip_items_source_id_films_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items" ADD CONSTRAINT "pages_blocks_film_strip_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_film_strip_items" ADD CONSTRAINT "pages_blocks_film_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_film_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row_cards" ADD CONSTRAINT "pages_blocks_people_row_cards_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row_cards" ADD CONSTRAINT "pages_blocks_people_row_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_people_row_cards" ADD CONSTRAINT "pages_blocks_people_row_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_people_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list_items" ADD CONSTRAINT "pages_blocks_press_list_items_source_id_appearances_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."appearances"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list_items" ADD CONSTRAINT "pages_blocks_press_list_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_press_list_items" ADD CONSTRAINT "pages_blocks_press_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_press_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" ADD CONSTRAINT "_pages_v_blocks_deck_hero_cards_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" ADD CONSTRAINT "_pages_v_blocks_deck_hero_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero_cards" ADD CONSTRAINT "_pages_v_blocks_deck_hero_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_deck_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_brand_strip_items" ADD CONSTRAINT "_pages_v_blocks_brand_strip_items_source_id_brands_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_brand_strip_items" ADD CONSTRAINT "_pages_v_blocks_brand_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_brand_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items_watch" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_watch_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_film_strip_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_source_id_films_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_film_strip_items" ADD CONSTRAINT "_pages_v_blocks_film_strip_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_film_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row_cards" ADD CONSTRAINT "_pages_v_blocks_people_row_cards_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row_cards" ADD CONSTRAINT "_pages_v_blocks_people_row_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_people_row_cards" ADD CONSTRAINT "_pages_v_blocks_people_row_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_people_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list_items" ADD CONSTRAINT "_pages_v_blocks_press_list_items_source_id_appearances_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."appearances"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list_items" ADD CONSTRAINT "_pages_v_blocks_press_list_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_press_list_items" ADD CONSTRAINT "_pages_v_blocks_press_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_press_list"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_deck_hero_cards_order_idx" ON "pages_blocks_deck_hero_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_deck_hero_cards_parent_id_idx" ON "pages_blocks_deck_hero_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_deck_hero_cards_source_idx" ON "pages_blocks_deck_hero_cards" USING btree ("source_id");
  CREATE INDEX "pages_blocks_deck_hero_cards_image_idx" ON "pages_blocks_deck_hero_cards" USING btree ("image_id");
  CREATE INDEX "pages_blocks_brand_strip_items_order_idx" ON "pages_blocks_brand_strip_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_brand_strip_items_parent_id_idx" ON "pages_blocks_brand_strip_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_brand_strip_items_source_idx" ON "pages_blocks_brand_strip_items" USING btree ("source_id");
  CREATE INDEX "pages_blocks_film_strip_items_watch_order_idx" ON "pages_blocks_film_strip_items_watch" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_strip_items_watch_parent_id_idx" ON "pages_blocks_film_strip_items_watch" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_strip_items_order_idx" ON "pages_blocks_film_strip_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_film_strip_items_parent_id_idx" ON "pages_blocks_film_strip_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_film_strip_items_source_idx" ON "pages_blocks_film_strip_items" USING btree ("source_id");
  CREATE INDEX "pages_blocks_film_strip_items_image_idx" ON "pages_blocks_film_strip_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_people_row_cards_order_idx" ON "pages_blocks_people_row_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_people_row_cards_parent_id_idx" ON "pages_blocks_people_row_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_people_row_cards_source_idx" ON "pages_blocks_people_row_cards" USING btree ("source_id");
  CREATE INDEX "pages_blocks_people_row_cards_image_idx" ON "pages_blocks_people_row_cards" USING btree ("image_id");
  CREATE INDEX "pages_blocks_press_list_items_order_idx" ON "pages_blocks_press_list_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_press_list_items_parent_id_idx" ON "pages_blocks_press_list_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_press_list_items_source_idx" ON "pages_blocks_press_list_items" USING btree ("source_id");
  CREATE INDEX "pages_blocks_press_list_items_image_idx" ON "pages_blocks_press_list_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_deck_hero_cards_order_idx" ON "_pages_v_blocks_deck_hero_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_deck_hero_cards_parent_id_idx" ON "_pages_v_blocks_deck_hero_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_deck_hero_cards_source_idx" ON "_pages_v_blocks_deck_hero_cards" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_deck_hero_cards_image_idx" ON "_pages_v_blocks_deck_hero_cards" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_brand_strip_items_order_idx" ON "_pages_v_blocks_brand_strip_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_brand_strip_items_parent_id_idx" ON "_pages_v_blocks_brand_strip_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_brand_strip_items_source_idx" ON "_pages_v_blocks_brand_strip_items" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_film_strip_items_watch_order_idx" ON "_pages_v_blocks_film_strip_items_watch" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_strip_items_watch_parent_id_idx" ON "_pages_v_blocks_film_strip_items_watch" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_strip_items_order_idx" ON "_pages_v_blocks_film_strip_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_film_strip_items_parent_id_idx" ON "_pages_v_blocks_film_strip_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_film_strip_items_source_idx" ON "_pages_v_blocks_film_strip_items" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_film_strip_items_image_idx" ON "_pages_v_blocks_film_strip_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_people_row_cards_order_idx" ON "_pages_v_blocks_people_row_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_people_row_cards_parent_id_idx" ON "_pages_v_blocks_people_row_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_people_row_cards_source_idx" ON "_pages_v_blocks_people_row_cards" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_people_row_cards_image_idx" ON "_pages_v_blocks_people_row_cards" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_press_list_items_order_idx" ON "_pages_v_blocks_press_list_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_press_list_items_parent_id_idx" ON "_pages_v_blocks_press_list_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_press_list_items_source_idx" ON "_pages_v_blocks_press_list_items" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_press_list_items_image_idx" ON "_pages_v_blocks_press_list_items" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_deck_hero_cards" CASCADE;
  DROP TABLE "pages_blocks_brand_strip_items" CASCADE;
  DROP TABLE "pages_blocks_film_strip_items_watch" CASCADE;
  DROP TABLE "pages_blocks_film_strip_items" CASCADE;
  DROP TABLE "pages_blocks_people_row_cards" CASCADE;
  DROP TABLE "pages_blocks_press_list_items" CASCADE;
  DROP TABLE "_pages_v_blocks_deck_hero_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_brand_strip_items" CASCADE;
  DROP TABLE "_pages_v_blocks_film_strip_items_watch" CASCADE;
  DROP TABLE "_pages_v_blocks_film_strip_items" CASCADE;
  DROP TABLE "_pages_v_blocks_people_row_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_press_list_items" CASCADE;`)
}
