import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "preview_url" varchar;
  ALTER TABLE "entries" ADD COLUMN "preview_image_id" integer;
  ALTER TABLE "_entries_v" ADD COLUMN "version_preview_url" varchar;
  ALTER TABLE "_entries_v" ADD COLUMN "version_preview_image_id" integer;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_preview_image_id_media_id_fk" FOREIGN KEY ("preview_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_preview_image_id_media_id_fk" FOREIGN KEY ("version_preview_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "entries_preview_image_idx" ON "entries" USING btree ("preview_image_id");
  CREATE INDEX "_entries_v_version_version_preview_image_idx" ON "_entries_v" USING btree ("version_preview_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" DROP CONSTRAINT "entries_preview_image_id_media_id_fk";
  
  ALTER TABLE "_entries_v" DROP CONSTRAINT "_entries_v_version_preview_image_id_media_id_fk";
  
  DROP INDEX "entries_preview_image_idx";
  DROP INDEX "_entries_v_version_version_preview_image_idx";
  ALTER TABLE "entries" DROP COLUMN "preview_url";
  ALTER TABLE "entries" DROP COLUMN "preview_image_id";
  ALTER TABLE "_entries_v" DROP COLUMN "version_preview_url";
  ALTER TABLE "_entries_v" DROP COLUMN "version_preview_image_id";`)
}
