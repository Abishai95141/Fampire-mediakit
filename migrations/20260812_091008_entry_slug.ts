import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "slug" varchar;
  ALTER TABLE "entries" ADD COLUMN "preview_file_id" varchar;
  ALTER TABLE "_entries_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "_entries_v" ADD COLUMN "version_preview_file_id" varchar;
  CREATE UNIQUE INDEX "entries_slug_idx" ON "entries" USING btree ("slug");
  CREATE INDEX "_entries_v_version_version_slug_idx" ON "_entries_v" USING btree ("version_slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "entries_slug_idx";
  DROP INDEX "_entries_v_version_version_slug_idx";
  ALTER TABLE "entries" DROP COLUMN "slug";
  ALTER TABLE "entries" DROP COLUMN "preview_file_id";
  ALTER TABLE "_entries_v" DROP COLUMN "version_slug";
  ALTER TABLE "_entries_v" DROP COLUMN "version_preview_file_id";`)
}
