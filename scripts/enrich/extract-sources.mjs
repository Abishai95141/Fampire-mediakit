/**
 * Pull the slices of the audit that this build actually needs into the repo.
 *
 * The audit lives outside this repo (~/Fampire) and its raw crawl is 15 MB of
 * per-file records we never use — all metadata signal is in the FOLDER path
 * (build plan §7.4). This lifts the three things enrichment reads and nothing
 * else, so the build is reproducible without carrying the crawl around.
 *
 * Run: node scripts/enrich/extract-sources.mjs [AUDIT_DIR]
 * Out: data/audit/{catalog.json, drive-folders.json, drive-folder-parents.json}
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIT = process.argv[2] ?? `${process.env.HOME}/Fampire/data`;
const OUT = `${ROOT}/data/audit`;

mkdirSync(OUT, { recursive: true });

const read = (f) => JSON.parse(readFileSync(`${AUDIT}/${f}`, "utf8"));
const write = (f, v) => {
  writeFileSync(`${OUT}/${f}`, JSON.stringify(v));
  const kb = (Buffer.byteLength(JSON.stringify(v)) / 1024).toFixed(0);
  console.log(`  ${f.padEnd(28)} ${kb} KB`);
};

console.log(`reading audit from ${AUDIT}`);

const catalog = read("catalog.json");
write("catalog.json", catalog);

// Only the id → name map. The `files` half of the crawl is what makes the
// original 15 MB and nothing here reads it.
const crawl = read("drive-crawl-full.json");
write("drive-folders.json", crawl.folders);

const parents = read("drive-folder-parents.json");

/**
 * Fold in the folders recovered from the uncrawled seeds, so they get preview
 * candidates like everything else. Without this the 13 recovered collections
 * would render as black placeholders.
 */
let supplement = { folders: {}, files: {}, parents: {} };
try {
  supplement = JSON.parse(readFileSync(`${OUT}/crawl-supplement.json`, "utf8"));
  for (const [id, name] of Object.entries(supplement.folders)) crawl.folders[id] ??= name;
  for (const [id, v] of Object.entries(supplement.files)) crawl.files[id] ??= v;
  for (const [c, pa] of Object.entries(supplement.parents)) parents[c] ??= pa;
  console.log(`  merged supplement: +${Object.keys(supplement.files).length} files`);
} catch { /* no supplement yet */ }

write("drive-folder-parents.json", parents);
write("drive-folders.json", crawl.folders);

/**
 * Candidate files for the orientation sampler (§5.3).
 *
 * Orientation cannot be derived from a path or a filename — it needs actual
 * pixels — so the sampler fetches thumbnails. It needs to know WHICH files to
 * fetch, which means carrying file ids. Carrying all 135,611 would reimport
 * the 15 MB crawl we deliberately left behind, so this keeps up to CANDIDATES
 * visually-typed files per Tier A folder: enough to resample at a different
 * rate later, ~4% of the size.
 *
 * Files are collected from the folder AND its descendants, because the rollup
 * (§4.2) merged subfolders — a collection's images usually live one or two
 * levels below the folder the entry points at.
 */
const CANDIDATES = 40;
const POOL = 800; // files examined per folder before ranking and capping
const VISUAL = new Set(["JPEG Image", "PNG Image", "Video", "Photo", "Image", "As is", ""]);

/**
 * Drive only generates a thumbnail for formats it can decode.
 *
 * Camera negatives and broadcast masters get none — a request for a `.ARW`,
 * `.MXF` or an `.XML` sidecar answers 404. Those files dominate the RAW
 * folders, so an unranked candidate list hands the sampler five negatives and
 * it learns nothing about a folder that also contains perfectly good MP4s.
 *
 * Lower rank is tried first.
 */
const THUMBNAILABLE = /\.(jpe?g|png|gif|webp|bmp|mp4|mov|m4v|avi|mkv|webm)$/i;
// TIFF is on this list from measurement, not assumption: Drive answers 404
// for every .tif we tried. Ranking it as thumbnailable let TIFFs crowd the
// JPEGs out of the candidate list in mixed folders.
const NEVER_THUMBNAILED = /\.(arw|cr2|cr3|nef|dng|raf|orf|rw2|srw|pef|braw|r3d|mxf|xml|aae|thm|lrv|md5|txt|wav|mp3|aif{1,2}|ale|edl|cube|tiff?|psd|ai|eps|heic|heif)$/i;

function rankOf(name) {
  if (NEVER_THUMBNAILED.test(name)) return 2;
  if (THUMBNAILABLE.test(name)) return 0;
  return 1; // unknown extension — worth a try, after the sure things
}

const childFolders = {};
for (const [child, parent] of Object.entries(parents)) {
  (childFolders[parent] ??= []).push(child);
}

const directFiles = {};
for (const [id, [name, type, parent]] of Object.entries(crawl.files)) {
  if (!parent || !VISUAL.has(type)) continue;
  (directFiles[parent] ??= []).push({ id, rank: rankOf(name) });
}
// Thumbnailable formats first within each folder, so the sampler spends its
// requests on files that can actually answer.
for (const list of Object.values(directFiles)) list.sort((a, b) => a.rank - b.rank);

/** Breadth-first so shallow files — usually the edited, representative ones —
 *  are reached before deep raw-camera folders. */
function candidatesFor(root) {
  const seenPool = [];
  const queue = [root];
  const seen = new Set();
  // Gather a WIDE pool first, then rank, then cap.
  //
  // Capping at 40 during the walk and ranking afterwards cannot work: a RAW
  // folder holds 300 .ARW negatives before its first JPEG, so the 40 collected
  // were all rank-2 and the good frames were never in the list to be promoted.
  // That left 40 folders unsampled for no reason other than collection order.
  while (queue.length && seenPool.length < POOL) {
    const folder = queue.shift();
    if (seen.has(folder)) continue;
    seen.add(folder);
    for (const f of directFiles[folder] ?? []) {
      seenPool.push(f);
      if (seenPool.length >= POOL) break;
    }
    for (const child of childFolders[folder] ?? []) queue.push(child);
  }
  return seenPool
    .sort((a, b) => a.rank - b.rank)
    .slice(0, CANDIDATES)
    .map((f) => f.id);
}

const folderIdOf = (url) => (/\/folders\/([^/?#]+)/.exec(url || "") ?? [])[1] ?? null;
let tierARows = catalog.filter((r) => /^[AB]/.test(String(r.tier)));
try {
  const rolled = JSON.parse(readFileSync(`${OUT}/catalog-rolled.json`, "utf8"));
  tierARows = rolled
    .filter((r) => /^[AB]/.test(String(r.tier)))
    .map((r) => ({ ...r, url: `https://drive.google.com/drive/folders/${r.folder_id}` }));
  console.log(`  candidates from catalog-rolled.json (${tierARows.length} Tier A)`);
} catch { /* fall back to the snapshot */ }

const sampleCandidates = {};
let noCandidates = 0;
for (const row of tierARows) {
  const id = folderIdOf(row.url);
  if (!id) continue;
  const c = candidatesFor(id);
  if (!c.length) noCandidates++;
  sampleCandidates[id] = c;
}
write("drive-sample-candidates.json", sampleCandidates);

console.log(
  `\n${catalog.length} subjects · ${tierARows.length} Tier A · ${Object.keys(crawl.folders).length} folder names`,
);
console.log(
  `sample candidates: ${Object.keys(sampleCandidates).length} folders · ` +
    `${Object.values(sampleCandidates).reduce((n, v) => n + v.length, 0)} files · ` +
    `${noCandidates} folders with none`,
);
