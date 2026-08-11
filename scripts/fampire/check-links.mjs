/**
 * Link health monitor.
 *
 * This is a required feature, not tooling. The whole platform is a catalog of
 * pointers at somebody else's storage, so link rot is the architecture's single
 * biggest risk — an entry that looks perfect and opens a 404 is worse than no
 * entry at all, because a journalist on deadline has already spent their trust
 * on it.
 *
 * The hard part is that almost nothing here fails with an honest status code:
 *
 *   Drive folder    the normal /drive/folders/ URL renders a client-side app
 *                   that returns 200 whether you can see the folder or not.
 *                   `embeddedfolderview` is server-rendered, so it 404s
 *                   properly and shows `flip-entries` when genuinely public.
 *   Drive file      a file you cannot open still returns 200, with a
 *                   "Request access" interstitial in the body.
 *   Dropbox         a deleted share returns 200 with an error page; `/home/`
 *                   paths resolve only for the account owner.
 *   Pic-Time        a pass-protected gallery returns 200 with a password form.
 *   Vimeo           a password-gated video returns 200 on the page and 403 on
 *                   oEmbed, which is the only reliable signal.
 *
 * So every platform gets its own probe, and "200 OK" is never on its own
 * treated as healthy.
 *
 * Writes data/fampire/link-health.json; build-catalog.mjs merges the result in
 * as `status` / `last_checked`. Kept separate so the generators stay
 * composable and re-running one never clobbers another's work.
 *
 * Run:  node scripts/fampire/check-links.mjs
 *       node scripts/fampire/check-links.mjs --json   (machine-readable summary)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = `${ROOT}/data/fampire/link-health.json`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const CONCURRENCY = 6;
const TIMEOUT_MS = 20_000;

/** The vocabulary the UI understands. Anything else is a bug in this file. */
const OK = "ok";
const GONE = "gone";
const LOGIN = "login-required";
const PASSWORD = "password";
const TIMEOUT = "timeout";
/** The host refuses automated requests outright. NOT evidence of rot, so it is
 *  reported separately and excluded from the health ratio — counting a live
 *  storefront as dead because it blocks datacenter IPs would send somebody to
 *  "fix" a link that works perfectly in a browser. */
const BLOCKED = "blocked";

/** Hosts known to answer 403 to anything that is not a real browser session. */
const BOT_HOSTILE = [/(^|\.)play\.google\.com$/, /(^|\.)amazon\.com$/, /(^|\.)primevideo\.com$/];
function isBotHostile(url) {
  try {
    const h = new URL(url).hostname;
    return BOT_HOSTILE.some((re) => re.test(h));
  } catch {
    return false;
  }
}

async function fetchText(url, { method = "GET" } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = method === "GET" ? await res.text() : "";
    return { status: res.status, finalUrl: res.url, body, ok: res.ok };
  } catch (err) {
    return { status: 0, finalUrl: url, body: "", ok: false, error: String(err) };
  }
}

const DRIVE_FOLDER = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/;
const DRIVE_FILE = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/;

async function probeDriveFolder(id) {
  const r = await fetchText(`https://drive.google.com/embeddedfolderview?id=${id}#list`);
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 404) return { status: GONE, detail: "folder id not found" };
  if (r.status === 403) return { status: LOGIN, detail: "403 from Drive" };
  // A real folder page always carries this container, empty or not.
  if (r.body.includes("flip-entries")) return { status: OK, detail: null };
  if (/sign in|request access|need access/i.test(r.body)) {
    return { status: LOGIN, detail: "Drive asks for sign-in" };
  }
  // 200 with no listing and no sign-in prompt is Drive throttling us, not a
  // dead link — saying "gone" here would flag healthy entries at random.
  return { status: TIMEOUT, detail: "no listing returned (likely rate-limited)" };
}

async function probeDriveFile(id) {
  const r = await fetchText(`https://drive.google.com/file/d/${id}/view`);
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 404) return { status: GONE, detail: "file id not found" };
  if (/request access|you need access/i.test(r.body)) {
    return { status: LOGIN, detail: "Drive asks for access" };
  }
  if (/accounts\.google\.com/.test(r.finalUrl)) {
    return { status: LOGIN, detail: "redirected to Google sign-in" };
  }
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `http ${r.status}` };
}

async function probeDropbox(url) {
  // Owner-only paths are a known, structural failure — no request needed.
  if (url.includes("/home/")) {
    return { status: LOGIN, detail: "/home/ path resolves only for the account owner" };
  }
  const r = await fetchText(url);
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 404 || r.status === 410) return { status: GONE, detail: `http ${r.status}` };
  if (/this link (doesn.t exist|has been disabled)|deleted this file|link not found/i.test(r.body)) {
    return { status: GONE, detail: "Dropbox says the link is gone" };
  }
  if (/password/i.test(r.body) && /enter the password/i.test(r.body)) {
    return { status: PASSWORD, detail: "password-protected share" };
  }
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `http ${r.status}` };
}

async function probePicTime(url) {
  const r = await fetchText(url);
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 404) return { status: GONE, detail: "http 404" };
  if (/\/(client|portfolio)\b/.test(url)) {
    return { status: PASSWORD, detail: "gallery root is pass-protected" };
  }
  if (/enter (the )?password|passcode/i.test(r.body)) {
    return { status: PASSWORD, detail: "password form" };
  }
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `http ${r.status}` };
}

async function probeVimeo(url) {
  const r = await fetchText(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  );
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 403) return { status: PASSWORD, detail: "private or password-gated" };
  if (r.status === 404) return { status: GONE, detail: "video not found" };
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `oembed ${r.status}` };
}

async function probeYouTube(url) {
  const r = await fetchText(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  );
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if (r.status === 401 || r.status === 403) return { status: LOGIN, detail: "private video" };
  if (r.status === 404) return { status: GONE, detail: "video not found" };
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `oembed ${r.status}` };
}

async function probeGeneric(url) {
  const r = await fetchText(url);
  if (r.status === 0) return { status: TIMEOUT, detail: r.error };
  if ((r.status === 403 || r.status === 503) && isBotHostile(url)) {
    return { status: BLOCKED, detail: `http ${r.status} — host blocks automated checks` };
  }
  if (r.status === 404 || r.status === 410) return { status: GONE, detail: `http ${r.status}` };
  if (/accounts\.google\.com|\/login\b/.test(r.finalUrl) && !/\/login\b/.test(url)) {
    return { status: LOGIN, detail: `redirected to ${new URL(r.finalUrl).hostname}` };
  }
  return { status: r.ok ? OK : GONE, detail: r.ok ? null : `http ${r.status}` };
}

async function probe(url) {
  const folder = DRIVE_FOLDER.exec(url)?.[1];
  if (folder) return probeDriveFolder(folder);
  const file = DRIVE_FILE.exec(url)?.[1];
  if (file) return probeDriveFile(file);
  if (/dropbox\.com/.test(url)) return probeDropbox(url);
  if (/pic-time\.com/.test(url)) return probePicTime(url);
  if (/vimeo\.com/.test(url)) return probeVimeo(url);
  if (/youtube\.com|youtu\.be/.test(url)) return probeYouTube(url);
  return probeGeneric(url);
}

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

// ── Run ─────────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(`${ROOT}/data/fampire/catalog.json`, "utf8"));
const appearances = JSON.parse(
  readFileSync(`${ROOT}/data/fampire/appearances.json`, "utf8"),
).appearances;

const targets = [
  ...catalog.entries.map((e) => ({ key: `entry:${e.id}`, label: e.title, url: e.url })),
  ...catalog.where_to_watch.map((w) => ({
    key: `watch:${w.film}:${w.platform}`,
    label: `${w.film} on ${w.platform}`,
    url: w.url,
  })),
  ...appearances.map((a) => ({ key: `press:${a.url}`, label: a.title, url: a.url })),
].filter((t) => t.url);

console.log(`checking ${targets.length} links at concurrency ${CONCURRENCY}…\n`);

let done = 0;
const results = await mapLimited(targets, CONCURRENCY, async (t) => {
  const r = await probe(t.url);
  done++;
  if (done % 25 === 0) console.log(`  ${done}/${targets.length}`);
  return { ...t, ...r };
});

// A single timestamp for the whole sweep, so "last_checked" means "as of this
// run" rather than a scatter of times that are hard to reason about.
const checkedAt = new Date().toISOString();

const health = Object.fromEntries(
  results.map((r) => [r.key, { status: r.status, detail: r.detail, last_checked: checkedAt }]),
);
writeFileSync(OUT, `${JSON.stringify({ checked_at: checkedAt, health }, null, 2)}\n`);

const by = results.reduce((a, r) => {
  a[r.status] = (a[r.status] ?? 0) + 1;
  return a;
}, {});

const problems = results.filter((r) => r.status !== OK);
if (problems.length) {
  console.log("\nNeeds attention:");
  for (const p of problems.sort((a, b) => a.status.localeCompare(b.status))) {
    console.log(`  [${p.status}] ${p.label}`);
    console.log(`           ${p.url}`);
    if (p.detail) console.log(`           ${p.detail}`);
  }
}

const healthy = (by[OK] ?? 0) / results.length;
console.log(`\n${results.length} links · ${(healthy * 100).toFixed(1)}% healthy`);
console.log(" ", by);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ checked_at: checkedAt, counts: by, problems }, null, 2));
}

// The build plan's target is >= 98% healthy. Exit non-zero below it so this can
// be wired to a nightly job that actually tells somebody.
process.exitCode = healthy >= 0.98 ? 0 : 1;
