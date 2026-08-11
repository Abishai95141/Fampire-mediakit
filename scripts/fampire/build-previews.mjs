/**
 * Harvests a real preview image for every catalog entry, without hosting one.
 *
 * A press room where most cards are type-only reads as unfinished, but we are
 * not allowed to invent imagery and we are not allowed to copy the client's
 * files onto our own storage. The way through is to ask each platform for the
 * thumbnail it already publishes:
 *
 *   Drive folder   crawl `embeddedfolderview` (the ONLY server-rendered view
 *                  of a Drive folder — the normal UI is client-rendered and
 *                  yields nothing), descend until real files appear, then use
 *                  drive.google.com/thumbnail?id=<fileId>
 *   Drive file     the same thumbnail endpoint, directly
 *   Vimeo          oEmbed, with the size suffix rewritten up from the 295px
 *                  default the API hands back
 *   YouTube        i.ytimg.com, maxres where it exists and hq as the fallback
 *   everything else (Dropbox, Pic-Time, their own sites)
 *                  the page's own og:image
 *
 * Nothing is downloaded or re-hosted — we store URLs, exactly as with the
 * assets themselves.
 *
 * Failure points this deliberately guards against, all of them learned the
 * hard way and documented in the build plan §7:
 *
 *  §7.1  Google throttles SILENTLY. A folder that is being rate-limited
 *        returns 200 with an empty entry list, so a crawler without retries
 *        under-reports and nothing errors. Rate-limited folders are retried
 *        with backoff, and a folder that comes back empty on the final attempt
 *        is recorded as `throttled`, not as `no files`.
 *  §7.2  `aria-label="Folder"` appears ONLY on folders, so classifying by it
 *        silently discards every file. Classify by href.
 *  §7.3  Never run two crawlers against Drive at once — concurrency is capped
 *        here and this script must not be run alongside another.
 *
 * Run:  node scripts/fampire/build-previews.mjs
 * Out:  data/fampire/previews.json   (merged into the catalog by build-catalog)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = `${ROOT}/data/fampire/previews.json`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Drive tolerates this comfortably; going wider is what triggers §7.1. */
const CONCURRENCY = 6;
const MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { attempt = 0 } = {}) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`http ${res.status}`);
    if (!res.ok) return { ok: false, status: res.status, body: "" };
    return { ok: true, status: res.status, body: await res.text() };
  } catch (err) {
    if (attempt + 1 >= MAX_ATTEMPTS) return { ok: false, status: 0, body: "", err: String(err) };
    // Exponential backoff. Under-reporting silently is the failure mode we are
    // paying this cost to avoid.
    await sleep(700 * 2 ** attempt + Math.floor(attempt * 250));
    return get(url, { attempt: attempt + 1 });
  }
}

// ── Google Drive ────────────────────────────────────────────────────────

const FOLDER_ID = /drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)/;
const FILE_ID = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/;

/** Image/video files carry a real thumbnail; a PDF or a doc does not. */
const VISUAL_ALT = /(image|photo|video|jpeg|jpg|png|heic|mp4|mov|quicktime)/i;

function parseFolder(html) {
  const entries = [];
  // Split on the class attribute itself, not the bare string: "flip-entry"
  // also appears in flip-entry-info, -title, -icon and half a dozen others.
  const chunks = html.split('class="flip-entry"').slice(1);
  for (const chunk of chunks) {
    const href = /href="([^"]+)"/.exec(chunk)?.[1] ?? "";
    const title = /flip-entry-title">([^<]*)</.exec(chunk)?.[1]?.trim() ?? "";
    const alt = /alt="([^"]*)"/.exec(chunk)?.[1] ?? "";
    // §7.2: classify by href. aria-label only ever says "Folder".
    const folder = FOLDER_ID.exec(href)?.[1];
    const file = FILE_ID.exec(href)?.[1];
    if (folder) entries.push({ kind: "folder", id: folder, title });
    else if (file) entries.push({ kind: "file", id: file, title, alt });
  }
  return entries;
}

async function readFolder(id) {
  const res = await get(`https://drive.google.com/embeddedfolderview?id=${id}#list`);
  if (!res.ok) return { entries: [], throttled: true };
  const entries = parseFolder(res.body);
  // A 200 with no entries at all is the signature of silent throttling — or of
  // a genuinely empty folder. We cannot tell them apart, so we say so rather
  // than recording a confident "nothing here".
  const looksLikeFolderPage = res.body.includes("flip-entries");
  return { entries, throttled: entries.length === 0 && !looksLikeFolderPage };
}

/**
 * Walk down until visual files turn up. Breadth-first and depth-capped: these
 * trees are production dumps (`CARD 1`, `Day 2`, `Colored Clips`) and a naive
 * full descent would be tens of thousands of requests for a thumbnail.
 */
async function firstVisualFiles(rootId, want = 4, maxDepth = 2) {
  const found = [];
  let level = [rootId];
  let throttled = false;

  for (let depth = 0; depth <= maxDepth && level.length && found.length < want; depth++) {
    const next = [];
    for (const id of level.slice(0, 6)) {
      const { entries, throttled: t } = await readFolder(id);
      if (t) throttled = true;
      for (const e of entries) {
        if (e.kind === "file" && VISUAL_ALT.test(e.alt)) {
          found.push({ id: e.id, title: e.title, alt: e.alt });
          if (found.length >= want) break;
        } else if (e.kind === "folder") {
          next.push(e.id);
        }
      }
      if (found.length >= want) break;
    }
    level = next;
  }
  return { files: found, throttled };
}

const driveThumb = (id, w = 1200) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

/**
 * The first file in a production folder is very often not a picture of
 * anything: `Lower Third` opens on a flat chroma-key plate, `Logos` on a
 * transparent PNG. Both are correct data and terrible previews.
 *
 * Rather than download and decode every candidate, score by the size of a
 * small JPEG render. Compression is a good enough detail detector — a flat
 * green plate is a couple of kilobytes at 400px wide, a photograph is tens.
 */
async function scoreThumb(id) {
  try {
    const res = await fetch(driveThumb(id, 400), {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return 0;
    const buf = await res.arrayBuffer();
    return buf.byteLength;
  } catch {
    return 0;
  }
}

/** Below this a 400px render is almost certainly a flat fill or a near-empty
 *  transparent asset, not a photograph. */
const FLAT_BYTES = 9_000;

// ── Other platforms ─────────────────────────────────────────────────────

function ogImage(html) {
  const m =
    /<meta[^>]+property="og:image"[^>]*content="([^"]+)"/i.exec(html) ??
    /<meta[^>]+content="([^"]+)"[^>]*property="og:image"/i.exec(html) ??
    /<meta[^>]+name="twitter:image"[^>]*content="([^"]+)"/i.exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

async function vimeoThumb(url) {
  const res = await get(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=1600`,
  );
  if (!res.ok) return null;
  try {
    const json = JSON.parse(res.body);
    // oEmbed hands back a 295px crop regardless of the width asked for; the
    // size lives in the filename suffix, so rewrite it.
    return (json.thumbnail_url ?? "").replace(/-d_\d+x\d+/, "-d_1600x900") || null;
  } catch {
    return null;
  }
}

function youtubeId(url) {
  return (
    /[?&]v=([A-Za-z0-9_-]{6,})/.exec(url)?.[1] ??
    /youtu\.be\/([A-Za-z0-9_-]{6,})/.exec(url)?.[1] ??
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/.exec(url)?.[1] ??
    null
  );
}

async function youtubeThumb(url) {
  const id = youtubeId(url);
  if (!id) return null;
  // maxres does not exist for every upload; hq always does.
  const max = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  try {
    const head = await fetch(max, { method: "HEAD", signal: AbortSignal.timeout(12_000) });
    if (head.ok && Number(head.headers.get("content-length") ?? 0) > 2000) return max;
  } catch {
    /* fall through */
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

async function pageOgImage(url) {
  const res = await get(url);
  if (!res.ok) return null;
  return ogImage(res.body);
}

// ── Resolve one target ──────────────────────────────────────────────────

async function resolvePreview(url) {
  const folder = FOLDER_ID.exec(url)?.[1];
  if (folder) {
    const { files, throttled } = await firstVisualFiles(folder, 6);
    if (!files.length) return { image: null, note: throttled ? "throttled" : "no-visual-files" };

    const scored = [];
    for (const f of files) scored.push({ ...f, bytes: await scoreThumb(f.id) });
    scored.sort((a, b) => b.bytes - a.bytes);

    const usable = scored.filter((f) => f.bytes >= FLAT_BYTES);
    // If everything in the folder is flat (a logo pack genuinely is), still
    // show the best of them — it is an honest picture of the contents.
    const pick = (usable[0] ?? scored[0]);
    if (!pick?.bytes) return { image: null, note: "thumbs-unavailable" };

    return {
      image: driveThumb(pick.id),
      // Extra frames give a collection card a contact-sheet strip rather than
      // one crop, which is what makes a folder read as a folder.
      strip: (usable.length ? usable : scored).slice(0, 4).map((f) => driveThumb(f.id, 600)),
      flat: usable.length === 0,
      note: "drive-folder",
    };
  }

  const file = FILE_ID.exec(url)?.[1];
  if (file) return { image: driveThumb(file), note: "drive-file" };

  // Dropbox shared FOLDERS render entirely client-side — there are zero
  // filenames in the HTML, so there is nothing to preview and no amount of
  // scraping changes that. Shared FILES are different: `raw=1` streams the
  // actual bytes, which is a real preview for an image.
  if (/dropbox\.com\/scl\/fi\//.test(url) && /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(url)) {
    const raw = /[?&]dl=\d/.test(url)
      ? url.replace(/([?&])dl=\d/, "$1raw=1")
      : `${url}${url.includes("?") ? "&" : "?"}raw=1`;
    return { image: raw, note: "dropbox-file" };
  }

  if (/vimeo\.com/.test(url)) {
    const image = await vimeoThumb(url);
    return { image, note: image ? "vimeo" : "vimeo-miss" };
  }

  if (/youtube\.com|youtu\.be/.test(url)) {
    const image = await youtubeThumb(url);
    return { image, note: image ? "youtube" : "youtube-miss" };
  }

  const image = await pageOgImage(url);
  return { image, note: image ? "og" : "og-miss" };
}

// ── Drive it ────────────────────────────────────────────────────────────

async function mapLimited(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const catalog = JSON.parse(readFileSync(`${ROOT}/data/fampire/catalog.json`, "utf8"));
const appearances = JSON.parse(
  readFileSync(`${ROOT}/data/fampire/appearances.json`, "utf8"),
).appearances;

// Resume support: a Drive crawl over ~60 folders is minutes of requests, and
// re-running from scratch after a failure is how you end up hammering one IP.
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { previews: {} };
const previews = { ...existing.previews };

const targets = [
  ...catalog.entries.map((e) => ({ key: `entry:${e.id}`, url: e.url })),
  ...appearances.map((a) => ({ key: `press:${a.url}`, url: a.url })),
];

const todo = targets.filter((t) => t.url && !previews[t.key]?.image);
console.log(
  `${targets.length} targets, ${targets.length - todo.length} already resolved, ${todo.length} to fetch`,
);

let done = 0;
await mapLimited(todo, CONCURRENCY, async (t) => {
  const result = await resolvePreview(t.url);
  previews[t.key] = result;
  done++;
  if (done % 10 === 0 || done === todo.length) {
    console.log(`  ${done}/${todo.length}`);
    writeFileSync(OUT, `${JSON.stringify({ previews }, null, 2)}\n`);
  }
});

writeFileSync(OUT, `${JSON.stringify({ previews }, null, 2)}\n`);

const byNote = Object.values(previews).reduce((a, p) => {
  a[p.note] = (a[p.note] ?? 0) + 1;
  return a;
}, {});
const withImage = Object.values(previews).filter((p) => p.image).length;
console.log(`previews.json — ${withImage}/${Object.keys(previews).length} resolved`);
console.log("  ", byNote);
