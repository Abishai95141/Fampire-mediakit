import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_scroll_expand_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_scroll_expand_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_scroll_expand" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_url" varchar,
  	"alt" varchar,
  	"title" varchar,
  	"scroll_hint" varchar,
  	"start_width" numeric DEFAULT 42,
  	"start_height" numeric DEFAULT 58,
  	"media_zoom" numeric DEFAULT 1.35,
  	"scroll_distance" numeric DEFAULT 1.2,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_scroll_expand_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_scroll_expand_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_scroll_expand" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_url" varchar,
  	"alt" varchar,
  	"title" varchar,
  	"scroll_hint" varchar,
  	"start_width" numeric DEFAULT 42,
  	"start_height" numeric DEFAULT 58,
  	"media_zoom" numeric DEFAULT 1.35,
  	"scroll_distance" numeric DEFAULT 1.2,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_scroll_expand_lines" ADD CONSTRAINT "pages_blocks_scroll_expand_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_scroll_expand"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_scroll_expand_notes" ADD CONSTRAINT "pages_blocks_scroll_expand_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_scroll_expand"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_scroll_expand" ADD CONSTRAINT "pages_blocks_scroll_expand_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_scroll_expand" ADD CONSTRAINT "pages_blocks_scroll_expand_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_scroll_expand_lines" ADD CONSTRAINT "_pages_v_blocks_scroll_expand_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_scroll_expand"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_scroll_expand_notes" ADD CONSTRAINT "_pages_v_blocks_scroll_expand_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_scroll_expand"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_scroll_expand" ADD CONSTRAINT "_pages_v_blocks_scroll_expand_image_id_landing_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."landing_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_scroll_expand" ADD CONSTRAINT "_pages_v_blocks_scroll_expand_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_scroll_expand_lines_order_idx" ON "pages_blocks_scroll_expand_lines" USING btree ("_order");
  CREATE INDEX "pages_blocks_scroll_expand_lines_parent_id_idx" ON "pages_blocks_scroll_expand_lines" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_scroll_expand_notes_order_idx" ON "pages_blocks_scroll_expand_notes" USING btree ("_order");
  CREATE INDEX "pages_blocks_scroll_expand_notes_parent_id_idx" ON "pages_blocks_scroll_expand_notes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_scroll_expand_order_idx" ON "pages_blocks_scroll_expand" USING btree ("_order");
  CREATE INDEX "pages_blocks_scroll_expand_parent_id_idx" ON "pages_blocks_scroll_expand" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_scroll_expand_path_idx" ON "pages_blocks_scroll_expand" USING btree ("_path");
  CREATE INDEX "pages_blocks_scroll_expand_image_idx" ON "pages_blocks_scroll_expand" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_scroll_expand_lines_order_idx" ON "_pages_v_blocks_scroll_expand_lines" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_scroll_expand_lines_parent_id_idx" ON "_pages_v_blocks_scroll_expand_lines" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_scroll_expand_notes_order_idx" ON "_pages_v_blocks_scroll_expand_notes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_scroll_expand_notes_parent_id_idx" ON "_pages_v_blocks_scroll_expand_notes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_scroll_expand_order_idx" ON "_pages_v_blocks_scroll_expand" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_scroll_expand_parent_id_idx" ON "_pages_v_blocks_scroll_expand" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_scroll_expand_path_idx" ON "_pages_v_blocks_scroll_expand" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_scroll_expand_image_idx" ON "_pages_v_blocks_scroll_expand" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_scroll_expand_lines" CASCADE;
  DROP TABLE "pages_blocks_scroll_expand_notes" CASCADE;
  DROP TABLE "pages_blocks_scroll_expand" CASCADE;
  DROP TABLE "_pages_v_blocks_scroll_expand_lines" CASCADE;
  DROP TABLE "_pages_v_blocks_scroll_expand_notes" CASCADE;
  DROP TABLE "_pages_v_blocks_scroll_expand" CASCADE;`)
}
