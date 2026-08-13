import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" DROP COLUMN "external";
  ALTER TABLE "brands" DROP COLUMN "external_href";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" ADD COLUMN "external" boolean DEFAULT false;
  ALTER TABLE "brands" ADD COLUMN "external_href" varchar;`)
}
