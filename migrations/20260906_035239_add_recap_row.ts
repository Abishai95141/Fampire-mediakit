import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_recap_row_recaps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"who" varchar,
  	"blurb" varchar,
  	"when" varchar,
  	"url" varchar,
  	"poster_url" varchar
  );
  
  CREATE TABLE "pages_blocks_recap_row" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_recap_row_recaps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"who" varchar,
  	"blurb" varchar,
  	"when" varchar,
  	"url" varchar,
  	"poster_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_recap_row" (
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
  
  ALTER TABLE "pages_blocks_recap_row_recaps" ADD CONSTRAINT "pages_blocks_recap_row_recaps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_recap_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_recap_row" ADD CONSTRAINT "pages_blocks_recap_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_recap_row_recaps" ADD CONSTRAINT "_pages_v_blocks_recap_row_recaps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_recap_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_recap_row" ADD CONSTRAINT "_pages_v_blocks_recap_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_recap_row_recaps_order_idx" ON "pages_blocks_recap_row_recaps" USING btree ("_order");
  CREATE INDEX "pages_blocks_recap_row_recaps_parent_id_idx" ON "pages_blocks_recap_row_recaps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recap_row_order_idx" ON "pages_blocks_recap_row" USING btree ("_order");
  CREATE INDEX "pages_blocks_recap_row_parent_id_idx" ON "pages_blocks_recap_row" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recap_row_path_idx" ON "pages_blocks_recap_row" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_recap_row_recaps_order_idx" ON "_pages_v_blocks_recap_row_recaps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_recap_row_recaps_parent_id_idx" ON "_pages_v_blocks_recap_row_recaps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_recap_row_order_idx" ON "_pages_v_blocks_recap_row" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_recap_row_parent_id_idx" ON "_pages_v_blocks_recap_row" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_recap_row_path_idx" ON "_pages_v_blocks_recap_row" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_recap_row_recaps" CASCADE;
  DROP TABLE "pages_blocks_recap_row" CASCADE;
  DROP TABLE "_pages_v_blocks_recap_row_recaps" CASCADE;
  DROP TABLE "_pages_v_blocks_recap_row" CASCADE;`)
}
