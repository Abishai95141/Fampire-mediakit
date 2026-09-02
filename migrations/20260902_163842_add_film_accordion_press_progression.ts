import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_press_list_layout" AS ENUM('log', 'progression');
  CREATE TYPE "public"."enum__pages_v_blocks_press_list_layout" AS ENUM('log', 'progression');
  ALTER TYPE "public"."enum_pages_blocks_film_strip_layout" ADD VALUE 'accordion';
  ALTER TYPE "public"."enum__pages_v_blocks_film_strip_layout" ADD VALUE 'accordion';
  ALTER TABLE "pages_blocks_film_strip" ADD COLUMN "dark" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_press_list" ADD COLUMN "layout" "enum_pages_blocks_press_list_layout" DEFAULT 'log';
  ALTER TABLE "pages_blocks_press_list" ADD COLUMN "dark" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_film_strip" ADD COLUMN "dark" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_press_list" ADD COLUMN "layout" "enum__pages_v_blocks_press_list_layout" DEFAULT 'log';
  ALTER TABLE "_pages_v_blocks_press_list" ADD COLUMN "dark" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_film_strip" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_film_strip" ALTER COLUMN "layout" SET DEFAULT 'list'::text;
  DROP TYPE "public"."enum_pages_blocks_film_strip_layout";
  CREATE TYPE "public"."enum_pages_blocks_film_strip_layout" AS ENUM('list', 'grid', 'profiles');
  ALTER TABLE "pages_blocks_film_strip" ALTER COLUMN "layout" SET DEFAULT 'list'::"public"."enum_pages_blocks_film_strip_layout";
  ALTER TABLE "pages_blocks_film_strip" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_pages_blocks_film_strip_layout" USING "layout"::"public"."enum_pages_blocks_film_strip_layout";
  ALTER TABLE "_pages_v_blocks_film_strip" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_film_strip" ALTER COLUMN "layout" SET DEFAULT 'list'::text;
  DROP TYPE "public"."enum__pages_v_blocks_film_strip_layout";
  CREATE TYPE "public"."enum__pages_v_blocks_film_strip_layout" AS ENUM('list', 'grid', 'profiles');
  ALTER TABLE "_pages_v_blocks_film_strip" ALTER COLUMN "layout" SET DEFAULT 'list'::"public"."enum__pages_v_blocks_film_strip_layout";
  ALTER TABLE "_pages_v_blocks_film_strip" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__pages_v_blocks_film_strip_layout" USING "layout"::"public"."enum__pages_v_blocks_film_strip_layout";
  ALTER TABLE "pages_blocks_film_strip" DROP COLUMN "dark";
  ALTER TABLE "pages_blocks_press_list" DROP COLUMN "layout";
  ALTER TABLE "pages_blocks_press_list" DROP COLUMN "dark";
  ALTER TABLE "_pages_v_blocks_film_strip" DROP COLUMN "dark";
  ALTER TABLE "_pages_v_blocks_press_list" DROP COLUMN "layout";
  ALTER TABLE "_pages_v_blocks_press_list" DROP COLUMN "dark";
  DROP TYPE "public"."enum_pages_blocks_press_list_layout";
  DROP TYPE "public"."enum__pages_v_blocks_press_list_layout";`)
}
