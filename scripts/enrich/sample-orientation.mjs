/**
 * Orientation sampler (build plan §5.3).
 *
 * An editor filtering for VERTICAL b-roll is the single most common request
 * this catalog has to answer, and orientation is one of only two fields that
 * cannot be derived from a folder path — you have to look at pixels. Filenames
 * carry no signal either: 59% are camera defaults and orientation hints appear
 * in 1% (§7.4).
 *
 * So: fetch a handful of thumbnails per collection, read their aspect ratios,
 * and decide the collection's orientation from the sample.
 *
 * Discipline this inherits from the crawlers that came before it:
 *  - Concurrency stays at or below 16, and you never run two of these at once
 *    (§5.1, §7.3). Two crawlers racing turned a 588s pass into 6,462s.
 *  - Google throttles SILENTLY (§7.1). The first crawl under-reported by 27%
 *    and nothing errored. Anything that is not a confirmed image is retried
 *    with backoff, and whatever never resolves is reported as unresolved
 *    rather than quietly counted as landscape.
 *  - Checkpoint every batch. The full pass is ~2,800 requests.
 *
 * Run:    node scripts/enrich/sample-orientation.mjs [--per N] [--force]
 * Out:    data/fampire/orientation.json
 * Then:   node scripts/enrich/build-entries.mjs && npx payload run scripts/import-entries.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = `${ROOT}/data/fampire/orientation.json`;

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PER = Number(arg("--per", 5));
const FORCE = process.argv.includes("--force");
const CONCURRENCY = 12; // under the 16 ceiling, with headroom for the retries
const MAX_ATTEMPTS = 5;   // retries per file, for throttling
const MAX_TRIES = 18;     // files to walk per folder before giving up on it

const entries = JSON.parse(readFileSync(`${ROOT}/data/fampire/entries.json`, "utf8")).entries;
const candidates = JSON.parse(readFileSync(`${ROOT}/data/audit/drive-sample-candidates.json`, "utf8"));

// ── Resume ──────────────────────────────────────────────────────────────

const done = existsSync(OUT) && !FORCE ? JSON.parse(readFileSync(OUT, "utf8")) : { sampled: {} };
const sampled = done.sampled ?? {};
console.log(`resuming with ${Object.keys(sampled).length} folders already sampled`);

// ── Which files to look at ──────────────────────────────────────────────

/**
 * Spread the sample across the folder instead of taking the first N.
 *
 * Drive returns files roughly in upload order, so the first five are usually
 * five frames of one burst shot seconds apart — which would report a whole
 * mixed collection as whatever that one burst happened to be.
 */
function spread(list, n) {
  if (list.length <= n) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

// ── Fetch ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One thumbnail → {w, h} or a reason it is not usable.
 *
 * Drive answers a throttled request with a 403/429, and sometimes with a 200
 * carrying an HTML error page or a generic file icon. All three have to be
 * treated as "no answer yet", never as a measurement.
 */
async function measure(fileId) {
  let wait = 400;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
        { redirect: "follow", signal: AbortSignal.timeout(20000) },
      );

      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        await sleep(wait);
        wait *= 2;
        continue;
      }
      if (res.status === 404) return { skip: "gone" };
      if (!res.ok) return { skip: `http ${res.status}` };

      const type = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());

      // An HTML body on a 200 is a throttle or an interstitial, not an image.
      if (type.includes("text/html") || buf.length < 512) {
        await sleep(wait);
        wait *= 2;
        continue;
      }

      const { width, height } = await sharp(buf).metadata();
      if (!width || !height) return { skip: "no dimensions" };
      // Drive's generic file icon is small and square; it is not the asset.
      if (width < 40 || height < 40) return { skip: "generic icon" };
      return { w: width, h: height };
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) return { skip: (err?.message ?? "error").slice(0, 40) };
      await sleep(wait);
      wait *= 2;
    }
  }
  return { unresolved: true };
}

// ── Classification ──────────────────────────────────────────────────────

/** 10% either side of square is "square" — a 4:5 social crop is portrait, a
 *  1:1 product shot is not. */
function classify(w, h) {
  const r = w / h;
  if (r < 0.9) return "portrait";
  if (r > 1.1) return "landscape";
  return "square";
}

/**
 * A collection's orientation from its sampled frames.
 *
 * A clear majority names the collection; anything short of that is `mixed`,
 * which is an honest answer and a useful one — an editor who needs vertical
 * should not be sent to a folder that is 50% landscape.
 */
function aggregate(shots) {
  if (!shots.length) return { orientation: null, confidence: 0 };
  const counts = { portrait: 0, landscape: 0, square: 0 };
  for (const s of shots) counts[classify(s.w, s.h)]++;
  const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const share = n / shots.length;
  return {
    orientation: share >= 0.6 ? top : "mixed",
    confidence: Number(share.toFixed(2)),
    counts,
    samples: shots.length,
  };
}

// ── Pool ────────────────────────────────────────────────────────────────

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

// ── Run ─────────────────────────────────────────────────────────────────

const todo = entries.filter((e) => e.folder_id && !sampled[e.folder_id] && (candidates[e.folder_id]?.length ?? 0));
const skippedNoFiles = entries.filter((e) => !(candidates[e.folder_id]?.length ?? 0)).length;

console.log(`${todo.length} folders to sample · ${PER} thumbnails each · concurrency ${CONCURRENCY}`);
console.log(`${skippedNoFiles} folders have no visual candidate file\n`);

const started = process.hrtime.bigint();
let processed = 0;
let requests = 0;
let unresolved = 0;

const BATCH = 25;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);

  await pool(batch, CONCURRENCY, async (entry) => {
    /**
     * Keep going until PER usable frames, rather than taking exactly PER files
     * and accepting whatever comes back.
     *
     * A first pass that stopped at five left 114 folders — a fifth of the
     * library — with no orientation at all, because RAW folders handed it five
     * `.ARW` negatives and Drive has no thumbnail for those. The candidates are
     * now ranked so the good formats come first, but a folder can still be
     * mostly duds, so the sampler walks on until it has enough or runs out.
     */
    const pool_ = candidates[entry.folder_id];
    const order = spread(pool_, Math.min(pool_.length, MAX_TRIES));
    const shots = [];
    let missed = 0;
    let attempted = 0;

    for (const fileId of order) {
      if (shots.length >= PER) break;
      const m = await measure(fileId);
      requests++;
      attempted++;
      if (m.w) shots.push({ ...m, fileId });
      else if (m.unresolved) missed++;
    }

    if (missed) unresolved += missed;
    sampled[entry.folder_id] = {
      ...aggregate(shots),
      attempted,
      unresolved: missed,
      /**
       * The frame that will represent this collection when its URL is shared.
       *
       * Recorded here rather than guessed later because this is the one file
       * we have PROVEN Drive will render — picking the first candidate instead
       * is right about 90% of the time, and the other 10% is a link preview
       * with a broken image on it, which is worse than no image at all.
       *
       * Prefer a landscape frame: link unfurls are 1.91:1 and a portrait crops
       * badly in iMessage and Slack.
       */
      previewFileId:
        (shots.find((sh) => sh.w / sh.h > 1.1) ?? shots[0])?.fileId ?? null,
    };
    processed++;
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ per: PER, sampled }, null, 1));

  const secs = Number(process.hrtime.bigint() - started) / 1e9;
  const rate = processed / secs;
  const left = (todo.length - processed) / (rate || 1);
  console.log(
    `  ${String(processed).padStart(4)}/${todo.length} folders · ${requests} requests · ` +
      `${rate.toFixed(1)}/s · ~${Math.round(left)}s left`,
  );
}

// ── Report ──────────────────────────────────────────────────────────────

const all = Object.values(sampled);
const dist = {};
for (const s of all) dist[s.orientation ?? "unsampled"] = (dist[s.orientation ?? "unsampled"] ?? 0) + 1;

console.log(`\nsampled ${all.length} folders with ${requests} requests`);
console.log("orientation:", dist);
console.log(`unresolved thumbnails (retried to exhaustion): ${unresolved}`);

const weak = all.filter((s) => s.orientation && s.samples < 3).length;
if (weak) console.log(`${weak} folders decided on fewer than 3 usable frames — treat as provisional`);

console.log(`\nwrote ${OUT}`);
