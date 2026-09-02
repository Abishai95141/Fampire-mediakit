import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_deck_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wordmark" varchar,
  	"headline" varchar,
  	"headline_tail" varchar,
  	"rail" varchar,
  	"note" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_brand_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar DEFAULT 'We’ve helped them grow',
  	"marquee" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_deck_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"wordmark" varchar,
  	"headline" varchar,
  	"headline_tail" varchar,
  	"rail" varchar,
  	"note" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_brand_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar DEFAULT 'We’ve helped them grow',
  	"marquee" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_rels" ADD COLUMN "brands_id" integer;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "brands_id" integer;
  ALTER TABLE "pages_blocks_deck_hero" ADD CONSTRAINT "pages_blocks_deck_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_brand_strip" ADD CONSTRAINT "pages_blocks_brand_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_deck_hero" ADD CONSTRAINT "_pages_v_blocks_deck_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_brand_strip" ADD CONSTRAINT "_pages_v_blocks_brand_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_deck_hero_order_idx" ON "pages_blocks_deck_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_deck_hero_parent_id_idx" ON "pages_blocks_deck_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_deck_hero_path_idx" ON "pages_blocks_deck_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_brand_strip_order_idx" ON "pages_blocks_brand_strip" USING btree ("_order");
  CREATE INDEX "pages_blocks_brand_strip_parent_id_idx" ON "pages_blocks_brand_strip" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_brand_strip_path_idx" ON "pages_blocks_brand_strip" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_deck_hero_order_idx" ON "_pages_v_blocks_deck_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_deck_hero_parent_id_idx" ON "_pages_v_blocks_deck_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_deck_hero_path_idx" ON "_pages_v_blocks_deck_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_brand_strip_order_idx" ON "_pages_v_blocks_brand_strip" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_brand_strip_parent_id_idx" ON "_pages_v_blocks_brand_strip" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_brand_strip_path_idx" ON "_pages_v_blocks_brand_strip" USING btree ("_path");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_brands_id_idx" ON "pages_rels" USING btree ("brands_id");
  CREATE INDEX "_pages_v_rels_brands_id_idx" ON "_pages_v_rels" USING btree ("brands_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_deck_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_brand_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_deck_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_brand_strip" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_deck_hero" CASCADE;
  DROP TABLE "pages_blocks_brand_strip" CASCADE;
  DROP TABLE "_pages_v_blocks_deck_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_brand_strip" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_brands_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_brands_fk";
  
  DROP INDEX "pages_rels_brands_id_idx";
  DROP INDEX "_pages_v_rels_brands_id_idx";
  ALTER TABLE "pages_rels" DROP COLUMN "brands_id";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "brands_id";`)
}
