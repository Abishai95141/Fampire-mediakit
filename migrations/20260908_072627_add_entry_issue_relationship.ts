import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ADD COLUMN "issue_id" integer;
  ALTER TABLE "_entries_v" ADD COLUMN "version_issue_id" integer;
  ALTER TABLE "entries" ADD CONSTRAINT "entries_issue_id_magazine_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."magazine_issues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_entries_v" ADD CONSTRAINT "_entries_v_version_issue_id_magazine_issues_id_fk" FOREIGN KEY ("version_issue_id") REFERENCES "public"."magazine_issues"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "entries_issue_idx" ON "entries" USING btree ("issue_id");
  CREATE INDEX "_entries_v_version_version_issue_idx" ON "_entries_v" USING btree ("version_issue_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" DROP CONSTRAINT "entries_issue_id_magazine_issues_id_fk";
  
  ALTER TABLE "_entries_v" DROP CONSTRAINT "_entries_v_version_issue_id_magazine_issues_id_fk";
  
  DROP INDEX "entries_issue_idx";
  DROP INDEX "_entries_v_version_version_issue_idx";
  ALTER TABLE "entries" DROP COLUMN "issue_id";
  ALTER TABLE "_entries_v" DROP COLUMN "version_issue_id";`)
}
