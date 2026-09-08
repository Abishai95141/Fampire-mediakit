/**
 * Find a renderable cover frame for every entry that has none.
 *
 * 138 of 601 published collections had no `previewFileId`, so they rendered as
 * black "no public preview" plates — most of a library page at a glance. The
 * frames were never missing, only unsampled: the crawl holds all 135,611 files
 * and every one of those entries knows its folder id.
 *
 * The rule that matters: a preview is only accepted once Drive has ACTUALLY
 * served an image for it. Guessing the first file in a folder is how a card
 * ends up pointing at a 404, which looks worse than an honest placeholder — so
 * each candidate is fetched and checked for a real image body before it is
 * written. Video and RAW files are skipped: Drive renders thumbnails for them
 * inconsistently, and a broken frame costs more than a missing one.
 *
 * Resumable and idempotent — it only ever looks at entries with no preview, so
 * re-running picks up where a stopped run left off.
 *
 * Run: node scripts/enrich/backfill-previews.mjs
 *      LIMIT=20 node scripts/enrich/backfill-previews.mjs   (try a few first)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const HOME = process.env.HOME;
const OUT = "data/audit/backfilled-previews.json";
const LIMIT = Number(process.env.LIMIT ?? 0);

const crawl = JSON.parse(readFileSync(`${HOME}/Fampire/data/drive-crawl-full.json`, "utf8"));

/** folderId -> [fileId, name] for image-ish files, best candidates first. */
const byFolder = new Map();
const IMAGE = /\.(jpe?g|png|webp|heic|tiff?)$/i;
for (const [fid, v] of Object.entries(crawl.files)) {
  const [name, alt, parent] = v;
  if (!parent) continue;
  const isImage = IMAGE.test(name ?? "") || ["JPEG Image", "PNG Image", "Photo"].includes(alt);
  if (!isImage) continue;
  if (!byFolder.has(parent)) byFolder.set(parent, []);
  byFolder.get(parent).push(fid);
}

const psql = (sql, extra = []) =>
  execFileSync("psql", [
    process.env.DATABASE_URI ?? readFileSync(".env", "utf8").match(/DATABASE_URI=(.*)/)[1].replace(/"/g, ""),
    "-tA", ...extra, "-c", sql,
  ], { encoding: "utf8" }).trim();

/**
 * `-F` for the separator, never an escape inside the SQL string.
 *
 * This asked psql for `id || '\t' || folder_id`, and Postgres emits that as a
 * LITERAL backslash-t, not a tab — so `split("\t")` never split, every
 * folderId came back undefined, and the run reported "0 renderable frames" for
 * all 138. That is a false statement about the archive produced by a bug in
 * the checker, which is the worst kind: it looked like evidence.
 */
const rows = psql("select id, folder_id from entries where preview_file_id is null and folder_id is not null", ["-F", "|"])
  .split("\n").filter(Boolean).map((l) => l.split("|"));

console.log(`${rows.length} entries need a cover frame`);

/** Drive serves a thumbnail, or it does not. Only a real image body counts. */
async function renders(fileId) {
  try {
    const r = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w800`, { redirect: "follow" });
    if (!r.ok) return false;
    const type = r.headers.get("content-type") ?? "";
    const buf = await r.arrayBuffer();
    return type.startsWith("image/") && buf.byteLength > 3000;
  } catch {
    return false;
  }
}

const found = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
let hit = 0, miss = 0, done = 0;

for (const [, folderId] of rows) {
  if (LIMIT && done >= LIMIT) break;
  if (found[folderId]) continue;
  done++;
  const candidates = (byFolder.get(folderId) ?? []).slice(0, 6);
  let picked = null;
  for (const c of candidates) {
    if (await renders(c)) { picked = c; break; }
  }
  // Keyed by folderId, not the row id: numeric ids differ between the
  // local database and production, so an id-keyed file applies to nothing.
  if (picked) { found[folderId] = picked; hit++; } else { miss++; }
  if (done % 10 === 0) {
    writeFileSync(OUT, JSON.stringify(found, null, 2));
    console.log(`  ${done}/${rows.length} — ${hit} found, ${miss} without a renderable frame`);
  }
}

writeFileSync(OUT, JSON.stringify(found, null, 2));
console.log(`\n${hit} covers found, ${miss} folders had none that Drive renders`);
console.log(`wrote ${OUT} — apply with scripts/apply-previews.ts`);
