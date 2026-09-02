import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_lanes_layout" AS ENUM('cards', 'phases');
  CREATE TYPE "public"."enum__pages_v_blocks_lanes_layout" AS ENUM('cards', 'phases');
  ALTER TYPE "public"."enum_pages_blocks_people_row_layout" ADD VALUE 'roster';
  ALTER TYPE "public"."enum__pages_v_blocks_people_row_layout" ADD VALUE 'roster';
  CREATE TABLE "pages_blocks_statement_split_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_statement_split_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_statement_split" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"overlap" boolean DEFAULT false,
  	"dark" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement_split_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement_split_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement_split" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"overlap" boolean DEFAULT false,
  	"dark" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_lanes" ADD COLUMN "layout" "enum_pages_blocks_lanes_layout" DEFAULT 'cards';
  ALTER TABLE "_pages_v_blocks_lanes" ADD COLUMN "layout" "enum__pages_v_blocks_lanes_layout" DEFAULT 'cards';
  ALTER TABLE "pages_blocks_statement_split_lines" ADD CONSTRAINT "pages_blocks_statement_split_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split_notes" ADD CONSTRAINT "pages_blocks_statement_split_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement_split" ADD CONSTRAINT "pages_blocks_statement_split_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_lines" ADD CONSTRAINT "_pages_v_blocks_statement_split_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split_notes" ADD CONSTRAINT "_pages_v_blocks_statement_split_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_statement_split"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement_split" ADD CONSTRAINT "_pages_v_blocks_statement_split_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_statement_split_lines_order_idx" ON "pages_blocks_statement_split_lines" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_split_lines_parent_id_idx" ON "pages_blocks_statement_split_lines" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_split_notes_order_idx" ON "pages_blocks_statement_split_notes" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_split_notes_parent_id_idx" ON "pages_blocks_statement_split_notes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_split_order_idx" ON "pages_blocks_statement_split" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_split_parent_id_idx" ON "pages_blocks_statement_split" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_split_path_idx" ON "pages_blocks_statement_split" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_statement_split_lines_order_idx" ON "_pages_v_blocks_statement_split_lines" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_split_lines_parent_id_idx" ON "_pages_v_blocks_statement_split_lines" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_split_notes_order_idx" ON "_pages_v_blocks_statement_split_notes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_split_notes_parent_id_idx" ON "_pages_v_blocks_statement_split_notes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_split_order_idx" ON "_pages_v_blocks_statement_split" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_split_parent_id_idx" ON "_pages_v_blocks_statement_split" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_split_path_idx" ON "_pages_v_blocks_statement_split" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_statement_split_lines" CASCADE;
  DROP TABLE "pages_blocks_statement_split_notes" CASCADE;
  DROP TABLE "pages_blocks_statement_split" CASCADE;
  DROP TABLE "_pages_v_blocks_statement_split_lines" CASCADE;
  DROP TABLE "_pages_v_blocks_statement_split_notes" CASCADE;
  DROP TABLE "_pages_v_blocks_statement_split" CASCADE;
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::text;
  DROP TYPE "public"."enum_pages_blocks_people_row_layout";
  CREATE TYPE "public"."enum_pages_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles');
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::"public"."enum_pages_blocks_people_row_layout";
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_pages_blocks_people_row_layout" USING "layout"::"public"."enum_pages_blocks_people_row_layout";
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::text;
  DROP TYPE "public"."enum__pages_v_blocks_people_row_layout";
  CREATE TYPE "public"."enum__pages_v_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles');
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::"public"."enum__pages_v_blocks_people_row_layout";
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__pages_v_blocks_people_row_layout" USING "layout"::"public"."enum__pages_v_blocks_people_row_layout";
  ALTER TABLE "pages_blocks_lanes" DROP COLUMN "layout";
  ALTER TABLE "_pages_v_blocks_lanes" DROP COLUMN "layout";
  DROP TYPE "public"."enum_pages_blocks_lanes_layout";
  DROP TYPE "public"."enum__pages_v_blocks_lanes_layout";`)
}
