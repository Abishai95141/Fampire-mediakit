import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appearances" ADD COLUMN "_order" varchar;
  ALTER TABLE "_appearances_v" ADD COLUMN "version__order" varchar;
  CREATE INDEX "appearances__order_idx" ON "appearances" USING btree ("_order");
  CREATE INDEX "_appearances_v_version_version__order_idx" ON "_appearances_v" USING btree ("version__order");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "appearances__order_idx";
  DROP INDEX "_appearances_v_version_version__order_idx";
  ALTER TABLE "appearances" DROP COLUMN "_order";
  ALTER TABLE "_appearances_v" DROP COLUMN "version__order";`)
}
