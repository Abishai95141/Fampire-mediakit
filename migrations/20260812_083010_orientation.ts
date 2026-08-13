import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "orientation_confidence" numeric;
  ALTER TABLE "entries" ADD COLUMN "orientation_samples" numeric;
  ALTER TABLE "_entries_v" ADD COLUMN "version_orientation_confidence" numeric;
  ALTER TABLE "_entries_v" ADD COLUMN "version_orientation_samples" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" DROP COLUMN "orientation_confidence";
  ALTER TABLE "entries" DROP COLUMN "orientation_samples";
  ALTER TABLE "_entries_v" DROP COLUMN "version_orientation_confidence";
  ALTER TABLE "_entries_v" DROP COLUMN "version_orientation_samples";`)
}
