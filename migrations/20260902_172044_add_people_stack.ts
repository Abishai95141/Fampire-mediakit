import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_blocks_people_row_layout" ADD VALUE 'stack';
  ALTER TYPE "public"."enum__pages_v_blocks_people_row_layout" ADD VALUE 'stack';
  ALTER TABLE "pages_blocks_people_row" ADD COLUMN "dark" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_people_row" ADD COLUMN "rail" varchar;
  ALTER TABLE "_pages_v_blocks_people_row" ADD COLUMN "dark" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_people_row" ADD COLUMN "rail" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::text;
  DROP TYPE "public"."enum_pages_blocks_people_row_layout";
  CREATE TYPE "public"."enum_pages_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles', 'roster');
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::"public"."enum_pages_blocks_people_row_layout";
  ALTER TABLE "pages_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_pages_blocks_people_row_layout" USING "layout"::"public"."enum_pages_blocks_people_row_layout";
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::text;
  DROP TYPE "public"."enum__pages_v_blocks_people_row_layout";
  CREATE TYPE "public"."enum__pages_v_blocks_people_row_layout" AS ENUM('names', 'portraits', 'profiles', 'roster');
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DEFAULT 'portraits'::"public"."enum__pages_v_blocks_people_row_layout";
  ALTER TABLE "_pages_v_blocks_people_row" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__pages_v_blocks_people_row_layout" USING "layout"::"public"."enum__pages_v_blocks_people_row_layout";
  ALTER TABLE "pages_blocks_people_row" DROP COLUMN "dark";
  ALTER TABLE "pages_blocks_people_row" DROP COLUMN "rail";
  ALTER TABLE "_pages_v_blocks_people_row" DROP COLUMN "dark";
  ALTER TABLE "_pages_v_blocks_people_row" DROP COLUMN "rail";`)
}
