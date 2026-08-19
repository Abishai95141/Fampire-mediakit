import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" ADD COLUMN "portrait_url" varchar;
  ALTER TABLE "people" ADD COLUMN "portrait_image_id" integer;
  ALTER TABLE "films" ADD COLUMN "poster_url" varchar;
  ALTER TABLE "films" ADD COLUMN "poster_image_id" integer;
  ALTER TABLE "people" ADD CONSTRAINT "people_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "films" ADD CONSTRAINT "films_poster_image_id_media_id_fk" FOREIGN KEY ("poster_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "people_portrait_image_idx" ON "people" USING btree ("portrait_image_id");
  CREATE INDEX "films_poster_image_idx" ON "films" USING btree ("poster_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" DROP CONSTRAINT "people_portrait_image_id_media_id_fk";
  
  ALTER TABLE "films" DROP CONSTRAINT "films_poster_image_id_media_id_fk";
  
  DROP INDEX "people_portrait_image_idx";
  DROP INDEX "films_poster_image_idx";
  ALTER TABLE "people" DROP COLUMN "portrait_url";
  ALTER TABLE "people" DROP COLUMN "portrait_image_id";
  ALTER TABLE "films" DROP COLUMN "poster_url";
  ALTER TABLE "films" DROP COLUMN "poster_image_id";`)
}
