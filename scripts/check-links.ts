import config from "@payload-config";
import { getPayload, type Where } from "payload";

/**
 * Link health monitor (build plan §5.2).
 *
 * "A required feature, not tooling." This catalog stores links, never files —
 * so link rot is the architecture's single biggest risk (§2.1), and roughly 4%
 * of the client's links were already dead on arrival. An entry whose URL has
 * quietly stopped working is worse than a missing entry: a journalist on
 * deadline spends their trust on the click before finding out.
 *
 * §8 sets the bar at **≥98% healthy, monitored nightly**.
 *
 * The hard part, stated plainly in §5.2: *a Drive folder that returns 200 but
 * redirects to sign-in is NOT healthy.* Checking the canonical folder URL
 * cannot tell you that — Drive's own UI ships a "Sign in" button in the HTML of
 * a perfectly public folder, so matching on sign-in text marks every healthy
 * folder broken. Measured, on a folder we know is public:
 *
 *     GET /drive/folders/<id>        200 · 348,761 bytes · "Sign in" present
 *     GET /drive/folders/<bogus>     404 ·   1,651 bytes · "Sign in" absent
 *
 * The reliable probe is `embeddedfolderview`, the server-rendered listing the
 * original crawler used. It answers with actual folder contents or it does not:
 *
 *     public folder   200 · 56 flip-entry rows
 *     bogus id        404 ·  0 flip-entry rows
 *
 * Presence of rows is the health signal. Everything else is inference.
 *
 * Run:   npx payload run scripts/check-links.ts       (LIMIT=25 / ONLY_BROKEN=1 to scope)
 * Nightly: see the cron line at the bottom of this file.
 */

/**
 * Options come from the environment, not argv.
 *
 * `payload run` owns the CLI argument list and silently drops flags it does
 * not recognise — a `--limit 12` never reaches this script, and the run
 * quietly does something other than what was asked.
 *
 *   LIMIT=25 npx payload run scripts/check-links.ts
 *   ONLY_BROKEN=1 npx payload run scripts/check-links.ts
 */
const LIMIT = Number(process.env.LIMIT ?? "0") || 0;
const ONLY_BROKEN = process.env.ONLY_BROKEN === "1";

/** §5.1's ceiling. Never run two of these at once (§7.3). */
const CONCURRENCY = 12;
const ATTEMPTS = 4;
const TIMEOUT_MS = 20000;

type Status = "ok" | "gone" | "login-required" | "password" | "timeout" | "blocked";
type Result = { status: Status; detail: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const folderIdOf = (url: string) => /\/folders\/([^/?#]+)/.exec(url)?.[1] ?? null;

/**
 * Google Drive folders — probed through the server-rendered listing.
 *
 * A 200 carrying zero rows means the folder did not render its contents to an
 * anonymous request. Every catalog entry has at least ten files, so "no rows"
 * is never "empty" here — it is "not readable signed out", which is exactly
 * the failure a plain 200 check would have missed.
 */
async function checkDriveFolder(url: string): Promise<Result> {
  const id = folderIdOf(url);
  if (!id) return { status: "blocked", detail: "no folder id in URL" };

  let wait = 500;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // Throttling is not a verdict. Back off and ask again — under-reporting
      // health because Google was busy is how §7.1 hid 27% of the library.
      if (res.status === 429 || res.status >= 500) {
        if (attempt === ATTEMPTS) return { status: "timeout", detail: `rate limited (${res.status})` };
        await sleep(wait);
        wait *= 2;
        continue;
      }

      if (res.status === 404) return { status: "gone", detail: "folder not found" };
      if (res.status === 403) return { status: "login-required", detail: "access denied signed out" };
      if (!res.ok) return { status: "blocked", detail: `http ${res.status}` };

      const body = await res.text();
      const rows = (body.match(/flip-entry/g) ?? []).length;
      if (rows > 0) return { status: "ok", detail: `${rows} items visible` };

      return {
        status: "login-required",
        detail: "200 but no contents rendered signed out",
      };
    } catch (err) {
      const msg = (err as Error)?.name === "TimeoutError" ? "timeout" : (err as Error).message;
      if (attempt === ATTEMPTS) {
        return { status: "timeout", detail: String(msg).slice(0, 60) };
      }
      await sleep(wait);
      wait *= 2;
    }
  }
  return { status: "timeout", detail: "exhausted retries" };
}

/**
 * Everything that is not a Drive folder.
 *
 * Dropbox, Pic-Time, Vimeo and the client's own sites. Vimeo entries are
 * password-gated by design (§3.1) — that is a documented access mode, not a
 * fault, so they must never be counted as broken.
 */
async function checkGeneric(url: string, access: string): Promise<Result> {
  if (access === "password") {
    return { status: "password", detail: "password-gated by design" };
  }

  let wait = 500;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "FAMPIRE-LinkMonitor/1.0" },
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt === ATTEMPTS) return { status: "timeout", detail: `rate limited (${res.status})` };
        await sleep(wait);
        wait *= 2;
        continue;
      }
      if (res.status === 404 || res.status === 410) return { status: "gone", detail: `http ${res.status}` };
      if (res.status === 401 || res.status === 403) {
        return { status: "login-required", detail: `http ${res.status}` };
      }
      if (!res.ok) return { status: "blocked", detail: `http ${res.status}` };

      // A 200 that landed on someone's sign-in page is not healthy.
      const host = new URL(res.url).hostname;
      if (/accounts\.google\.com|login\.|signin|auth\./i.test(host)) {
        return { status: "login-required", detail: `redirected to ${host}` };
      }

      return { status: "ok", detail: `http 200 · ${host}` };
    } catch (err) {
      const msg = (err as Error)?.name === "TimeoutError" ? "timeout" : (err as Error).message;
      if (attempt === ATTEMPTS) return { status: "timeout", detail: String(msg).slice(0, 60) };
      await sleep(wait);
      wait *= 2;
    }
  }
  return { status: "timeout", detail: "exhausted retries" };
}

async function pool<T, R>(items: T[], limit: number, worker: (t: T) => Promise<R>) {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i]!);
      }
    }),
  );
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────

const payload = await getPayload({ config });

const where: Where = {};
if (ONLY_BROKEN) where.linkStatus = { not_equals: "ok" };

const found = await payload.find({
  collection: "entries",
  where,
  limit: LIMIT || 2000,
  depth: 0,
  overrideAccess: true,
});

const docs = found.docs as unknown as {
  id: number;
  url: string;
  title: string;
  access: string;
  sourcePlatform: string;
}[];

console.log(`checking ${docs.length} links · concurrency ${CONCURRENCY}\n`);

const started = Date.now();
let done = 0;
const tally: Record<string, number> = {};

const results = await pool(docs, CONCURRENCY, async (doc) => {
  const isDriveFolder = doc.sourcePlatform === "drive" && /\/folders\//.test(doc.url);
  const result = isDriveFolder
    ? await checkDriveFolder(doc.url)
    : await checkGeneric(doc.url, doc.access);

  await payload.update({
    collection: "entries",
    id: doc.id,
    data: {
      linkStatus: result.status,
      linkStatusDetail: result.detail,
      lastChecked: new Date().toISOString(),
    },
    depth: 0,
    overrideAccess: true,
    // A health sweep must not create a new version of every entry every night,
    // and must not flip a draft into review. It records a fact about a URL.
    draft: false,
  });

  tally[result.status] = (tally[result.status] ?? 0) + 1;
  done++;
  if (done % 50 === 0) {
    const rate = done / ((Date.now() - started) / 1000);
    console.log(`  ${done}/${docs.length} · ${rate.toFixed(1)}/s`);
  }
  return { doc, result };
});

// ── Report ──────────────────────────────────────────────────────────────

const total = results.length;
// `password` is a documented access mode, not a fault (§3.1).
const healthy = (tally.ok ?? 0) + (tally.password ?? 0);

/**
 * Nothing checked is not zero percent healthy.
 *
 * A scoped run (ONLY_BROKEN with nothing broken) legitimately checks zero
 * links, and reporting that as "0.0% — BELOW THE §8 THRESHOLD" would page
 * somebody at 3am to tell them everything is fine.
 */
const pct = total ? (healthy / total) * 100 : null;

console.log(`\nchecked ${total} in ${Math.round((Date.now() - started) / 1000)}s`);
console.log("status:", tally);
console.log(
  pct === null
    ? "\nno links in scope — nothing to report"
    : `\nlink health: ${pct.toFixed(1)}%  (§8 requires >=98%)`,
);

const broken = results.filter((r) => !["ok", "password"].includes(r.result.status));
if (broken.length) {
  console.log(`\n${broken.length} need attention:`);
  for (const b of broken.slice(0, 25)) {
    console.log(`  [${b.result.status}] ${b.doc.title.slice(0, 62)}`);
    console.log(`      ${b.result.detail ?? ""}`);
  }
  if (broken.length > 25) console.log(`  …and ${broken.length - 25} more`);
  console.log("\nFilter these in the admin: Collections → Link status is not 'ok'.");
}

if (pct !== null && pct < 98) {
  console.log("\nBELOW THE §8 THRESHOLD.");
}

/**
 * Nightly, on the client's own host (§9.2 — they run it, we guide it):
 *
 *   0 3 * * *  cd /path/to/app && npx payload run scripts/check-links.ts >> logs/link-health.log 2>&1
 */
process.exit(0);
