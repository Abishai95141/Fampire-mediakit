/**
 * Crawl the Drive folders the original pass never visited.
 *
 * The audit's second critical finding: 15 folder ids taken from the client's
 * OWN link index were never reached by the crawler, and 13 are alive today
 * holding content — including all three "Love and Legend" event roots,
 * "2. The Guru" and "9. sHEALed BTS". That single gap is the sufficient cause
 * of Love = 0 collections, Legend = 0, and The Guru = 5.
 *
 * It also fixes the other half of that defect: the original crawlers are not
 * re-runnable — they need intermediates (urls.txt, drive_tree.json,
 * parents.json, rolled2.json) that no longer exist on disk, and they wrote no
 * logs. This one reads only what is in the repo, writes a reconciliation
 * report, and is safe to run repeatedly.
 *
 * Discipline inherited from §5.1/§7.1/§7.3:
 *  - concurrency <= 16, and never two crawlers at once
 *  - Google throttles SILENTLY, so 429/5xx are retried with backoff and never
 *    recorded as "empty"
 *  - classify by href, NOT by aria-label (§7.2 — aria-label appears only on
 *    folders, which silently discarded every file and looked plausible)
 *  - checkpoint every batch
 *
 * Run: node scripts/crawl/crawl-missing.mjs
 * Out: data/audit/crawl-supplement.json  +  crawl-report.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIT = `${ROOT}/data/audit`;
const OUT = `${AUDIT}/crawl-supplement.json`;
const REPORT = `${AUDIT}/crawl-report.json`;

const CONCURRENCY = 12;
const ATTEMPTS = 6;
const TIMEOUT_MS = 25000;

const decode = (s) =>
  String(s ?? "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One folder listing.
 *
 * Returns { folders:[{id,name}], files:[{id,name,type}] } or null when the
 * folder genuinely does not exist. Throttling never returns null — it retries,
 * because a silent under-report is how 27% of the library went missing.
 */
async function listFolder(id) {
  let wait = 600;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.status === 429 || res.status >= 500) {
        await sleep(wait); wait *= 2; continue;
      }
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return { gone: true, status: res.status };
      }
      if (!res.ok) { await sleep(wait); wait *= 2; continue; }

      const html = await res.text();
      const folders = [];
      const files = [];

      for (const chunk of html.split('class="flip-entry"').slice(1)) {
        // Classify by HREF. §7.2: aria-label="Folder" appears only on folders,
        // so classifying by it silently discarded every file and reported 0
        // files across 996 folders while looking entirely plausible.
        const folderHref = /\/drive\/folders\/([A-Za-z0-9_-]+)/.exec(chunk);
        const fileHref = /\/file\/d\/([A-Za-z0-9_-]+)/.exec(chunk);
        const name = decode((/flip-entry-title"[^>]*>([^<]*)</.exec(chunk) ?? [])[1] ?? "");
        // File type comes from the thumbnail's alt text, the same 13-value
        // vocabulary the original crawl recorded.
        const type = decode((/alt="([^"]*)"/.exec(chunk) ?? [])[1] ?? "");

        if (folderHref) folders.push({ id: folderHref[1], name });
        else if (fileHref) files.push({ id: fileHref[1], name, type });
      }
      return { folders, files };
    } catch {
      if (attempt === ATTEMPTS) return { failed: true };
      await sleep(wait); wait *= 2;
    }
  }
  return { failed: true };
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) { const i = next++; out[i] = await worker(items[i]); }
    }),
  );
  return out;
}

// ── Which seeds are missing ─────────────────────────────────────────────

/**
 * Compare against the PRISTINE crawl, not data/audit/drive-folders.json.
 *
 * extract-sources.mjs merges this supplement back into that file, so reading
 * it here makes the crawler think its own recovered seeds are already known —
 * it then finds nothing and overwrites the supplement with an empty result,
 * silently undoing the recovery. Read the original snapshot instead.
 */
const existing = JSON.parse(
  readFileSync(`${process.env.HOME}/Fampire/data/drive-crawl-full.json`, "utf8"),
).folders;

const sources = [
  `${ROOT}/data/fampire/sources/broll-asset-library-links.json`,
  `${ROOT}/data/fampire/sources/broll-asset-library.txt`,
  `${ROOT}/data/fampire/sources/media-kit-page-links.json`,
  `${process.env.HOME}/Fampire/data/source-urls.txt`,
];

const seedIds = new Set();
for (const f of sources) {
  if (!existsSync(f)) continue;
  for (const m of readFileSync(f, "utf8").matchAll(/\/folders\/([A-Za-z0-9_-]{10,})/g)) {
    seedIds.add(m[1]);
  }
}

const missing = [...seedIds].filter((id) => !(id in existing));
console.log(`${seedIds.size} seed folder ids across ${sources.length} sources`);
console.log(`${missing.length} never crawled — starting BFS from each\n`);

// ── BFS ─────────────────────────────────────────────────────────────────

const folders = {};
const files = {};
const parents = {};
const gone = [];
const failed = [];

let frontier = missing.slice();
const visited = new Set();
let depth = 0;

while (frontier.length) {
  depth++;
  const batch = frontier.filter((id) => !visited.has(id));
  batch.forEach((id) => visited.add(id));
  if (!batch.length) break;

  const results = await pool(batch, CONCURRENCY, (id) => listFolder(id));
  const nextFrontier = [];

  results.forEach((r, i) => {
    const id = batch[i];
    if (!r || r.failed) { failed.push(id); return; }
    if (r.gone) { gone.push({ id, status: r.status }); return; }

    folders[id] ??= folders[id] ?? "";
    for (const f of r.folders) {
      folders[f.id] = f.name;
      parents[f.id] = id;
      nextFrontier.push(f.id);
    }
    for (const f of r.files) {
      files[f.id] = [f.name, f.type, id];
    }
  });

  console.log(
    `  depth ${String(depth).padStart(2)} · ${batch.length} folders · ` +
    `+${Object.keys(files).length} files total · ${nextFrontier.length} queued`,
  );

  mkdirSync(AUDIT, { recursive: true });
  writeFileSync(OUT, JSON.stringify({ folders, files, parents, gone, failed }));
  frontier = nextFrontier;
}

// ── Resolve the seeds' own names ────────────────────────────────────────

/**
 * `embeddedfolderview` lists a folder's CONTENTS but never states the folder's
 * own name, so a seed arrives nameless. A nameless folder has no subject, so
 * the rollup anchors it to itself and it surfaces as "Untitled collection".
 *
 * The normal Drive page does carry it, in <title>. One extra request per seed
 * recovers names like "Anthony Lolli Headshot and Bio" — which is the
 * difference between an unusable row and the headshots the booking page needs.
 */
const nameless = Object.keys(folders).filter((id) => !folders[id]);
if (nameless.length) {
  console.log(`\nresolving ${nameless.length} folder names…`);
  await pool(nameless, CONCURRENCY, async (id) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`https://drive.google.com/drive/folders/${id}`, {
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return;
        const html = await res.text();
        const t = decode((/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? "");
        // Drive appends its own product name with an en dash or a hyphen.
        const name = t.replace(/\s*[-–—]\s*Google Drive\s*$/i, "").trim();
        if (name && !/^Google Drive$/i.test(name)) folders[id] = name;
        return;
      } catch {
        await sleep(500 * attempt);
      }
    }
  });
  const resolved = nameless.filter((id) => folders[id]).length;
  console.log(`  resolved ${resolved} of ${nameless.length}`);
  for (const id of nameless) if (folders[id]) console.log(`   - ${folders[id]}`);
  writeFileSync(OUT, JSON.stringify({ folders, files, parents, gone, failed }));
}

// ── Report ──────────────────────────────────────────────────────────────

const report = {
  seedsConsidered: seedIds.size,
  seedsMissing: missing.length,
  seedsAlive: missing.length - gone.length - failed.length,
  gone,
  failed,
  foldersDiscovered: Object.keys(folders).length,
  filesDiscovered: Object.keys(files).length,
  maxDepth: depth,
};

writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`\nseeds: ${missing.length} missing · ${gone.length} gone · ${failed.length} failed`);
console.log(`discovered: ${report.foldersDiscovered} folders · ${report.filesDiscovered} files`);
console.log(`\nwrote ${OUT}`);
console.log(`wrote ${REPORT}`);
