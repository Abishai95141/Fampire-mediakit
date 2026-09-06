import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_recap_row_layout" AS ENUM('cards', 'coverflow');
  CREATE TYPE "public"."enum__pages_v_blocks_recap_row_layout" AS ENUM('cards', 'coverflow');
  ALTER TABLE "pages_blocks_recap_row_recaps" ADD COLUMN "video_url" varchar;
  ALTER TABLE "pages_blocks_recap_row_recaps" ADD COLUMN "strip_url" varchar;
  ALTER TABLE "pages_blocks_recap_row" ADD COLUMN "layout" "enum_pages_blocks_recap_row_layout" DEFAULT 'cards';
  ALTER TABLE "pages_blocks_recap_row" ADD COLUMN "margin" varchar;
  ALTER TABLE "_pages_v_blocks_recap_row_recaps" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_pages_v_blocks_recap_row_recaps" ADD COLUMN "strip_url" varchar;
  ALTER TABLE "_pages_v_blocks_recap_row" ADD COLUMN "layout" "enum__pages_v_blocks_recap_row_layout" DEFAULT 'cards';
  ALTER TABLE "_pages_v_blocks_recap_row" ADD COLUMN "margin" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_recap_row_recaps" DROP COLUMN "video_url";
  ALTER TABLE "pages_blocks_recap_row_recaps" DROP COLUMN "strip_url";
  ALTER TABLE "pages_blocks_recap_row" DROP COLUMN "layout";
  ALTER TABLE "pages_blocks_recap_row" DROP COLUMN "margin";
  ALTER TABLE "_pages_v_blocks_recap_row_recaps" DROP COLUMN "video_url";
  ALTER TABLE "_pages_v_blocks_recap_row_recaps" DROP COLUMN "strip_url";
  ALTER TABLE "_pages_v_blocks_recap_row" DROP COLUMN "layout";
  ALTER TABLE "_pages_v_blocks_recap_row" DROP COLUMN "margin";
  DROP TYPE "public"."enum_pages_blocks_recap_row_layout";
  DROP TYPE "public"."enum__pages_v_blocks_recap_row_layout";`)
}
