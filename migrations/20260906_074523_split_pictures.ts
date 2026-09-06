import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_statement_split_pictures" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement_split_pictures" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" integer,
  	"image_id" integer,
  	"image_url" varchar,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_statement_split_pictures" ADD CONSTRAINT "pages_blocks_statement_split_pictures_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split_pictures" ADD CONSTRAINT "pages_blocks_statement_split_pictures_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split_pictures" ADD CONSTRAINT "pages_blocks_statement_split_pictures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" ADD CONSTRAINT "_pages_v_blocks_statement_split_pictures_source_id_people_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" ADD CONSTRAINT "_pages_v_blocks_statement_split_pictures_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_pictures" ADD CONSTRAINT "_pages_v_blocks_statement_split_pictures_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_statement_split_pictures_order_idx" ON "pages_blocks_statement_split_pictures" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_split_pictures_parent_id_idx" ON "pages_blocks_statement_split_pictures" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_split_pictures_source_idx" ON "pages_blocks_statement_split_pictures" USING btree ("source_id");
  CREATE INDEX "pages_blocks_statement_split_pictures_image_idx" ON "pages_blocks_statement_split_pictures" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_statement_split_pictures_order_idx" ON "_pages_v_blocks_statement_split_pictures" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_split_pictures_parent_id_idx" ON "_pages_v_blocks_statement_split_pictures" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_split_pictures_source_idx" ON "_pages_v_blocks_statement_split_pictures" USING btree ("source_id");
  CREATE INDEX "_pages_v_blocks_statement_split_pictures_image_idx" ON "_pages_v_blocks_statement_split_pictures" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_statement_split_pictures" CASCADE;
  DROP TABLE "_pages_v_blocks_statement_split_pictures" CASCADE;`)
}
