import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_entries_occasion" ADD VALUE 'unspecified';
  ALTER TYPE "public"."enum__entries_v_version_occasion" ADD VALUE 'unspecified';
  ALTER TYPE "public"."enum_pages_blocks_entry_query_filters_occasion" ADD VALUE 'unspecified';
  ALTER TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion" ADD VALUE 'unspecified';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "entries" ALTER COLUMN "occasion" SET DATA TYPE text;
  DROP TYPE "public"."enum_entries_occasion";
  CREATE TYPE "public"."enum_entries_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  ALTER TABLE "entries" ALTER COLUMN "occasion" SET DATA TYPE "public"."enum_entries_occasion" USING "occasion"::"public"."enum_entries_occasion";
  ALTER TABLE "_entries_v" ALTER COLUMN "version_occasion" SET DATA TYPE text;
  DROP TYPE "public"."enum__entries_v_version_occasion";
  CREATE TYPE "public"."enum__entries_v_version_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  ALTER TABLE "_entries_v" ALTER COLUMN "version_occasion" SET DATA TYPE "public"."enum__entries_v_version_occasion" USING "version_occasion"::"public"."enum__entries_v_version_occasion";
  ALTER TABLE "pages_blocks_entry_query_filters_occasion" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_blocks_entry_query_filters_occasion";
  CREATE TYPE "public"."enum_pages_blocks_entry_query_filters_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  ALTER TABLE "pages_blocks_entry_query_filters_occasion" ALTER COLUMN "value" SET DATA TYPE "public"."enum_pages_blocks_entry_query_filters_occasion" USING "value"::"public"."enum_pages_blocks_entry_query_filters_occasion";
  ALTER TABLE "_pages_v_blocks_entry_query_filters_occasion" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion";
  CREATE TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion" AS ENUM('premiere', 'book-signing', 'clinic-production', 'conference', 'cover-shoot', 'roundtable', 'speaking', 'festival', 'interview', 'workout', 'podcast');
  ALTER TABLE "_pages_v_blocks_entry_query_filters_occasion" ALTER COLUMN "value" SET DATA TYPE "public"."enum__pages_v_blocks_entry_query_filters_occasion" USING "value"::"public"."enum__pages_v_blocks_entry_query_filters_occasion";`)
}
