import { readFileSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Migrate the where-to-watch matrix into the CMS.
 *
 * `films_watch` had 0 rows while the page claimed "streaming on eleven
 * platforms" and simultaneously rendered "0 of 0 are free to stream". The data
 * existed the whole time, in the legacy catalog's `where_to_watch` array —
 * it was simply never migrated when films moved to Payload.
 *
 * Run: npx payload run scripts/seed-watch.ts
 */
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const legacy = JSON.parse(readFileSync("data/fampire/catalog.json", "utf8"));
const watch: { film: string; platform: string; url: string; free?: boolean }[] =
  legacy.where_to_watch ?? [];

const byFilm = new Map<string, typeof watch>();
for (const w of watch) {
  if (!byFilm.has(w.film)) byFilm.set(w.film, []);
  byFilm.get(w.film)!.push(w);
}

let updated = 0;
for (const [title, rows] of byFilm) {
  const found = await api.find({
    collection: "films",
    where: { title: { equals: title } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (!found.docs.length) {
    console.log(`  no film record for "${title}" — skipped`);
    continue;
  }
  await api.update({
    collection: "films",
    id: found.docs[0].id,
    data: {
      watch: rows.map((w) => ({ platform: w.platform, url: w.url, free: Boolean(w.free) })),
    },
    depth: 0,
    overrideAccess: true,
  });
  updated++;
  console.log(`  ${title}: ${rows.length} platforms`);
}

const total = await api.find({ collection: "films", limit: 50, depth: 0, overrideAccess: true });
const rows = total.docs.reduce((n: number, f: { watch?: unknown[] }) => n + (f.watch?.length ?? 0), 0);
const platforms = new Set(
  total.docs.flatMap((f: { watch?: { platform: string }[] }) => (f.watch ?? []).map((w) => w.platform)),
);
console.log(`\n${updated} films updated · ${rows} watch links · ${platforms.size} distinct platforms`);
process.exit(0);
