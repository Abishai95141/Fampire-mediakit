/**
 * Load every public page in a real browser and fail on any client-side error.
 *
 * This exists because of a bug that every other check in this repo passed
 * cleanly while the site was visibly broken:
 *
 *   HeroVideo's effect called a hoisted `releasePreloader()` above the `let`
 *   it closes over, so the `!embeddable` path threw "Cannot access 'released'
 *   before initialization". The server-rendered HTML was perfect — correct
 *   title, correct stats, correct markup, 200 on every route — and the page
 *   was a full-screen Next.js error overlay. curl cannot see that, and neither
 *   can an HTML parser. Only a browser that executes the page can.
 *
 * It also fires exactly on the path this deployment is on, since Vimeo refuses
 * the hero embed until the client allowlists the domain — so the fallback that
 * exists to keep the site working was itself the thing that broke it.
 *
 * Fails on: uncaught exceptions, console errors, and the Next.js dev overlay.
 * Ignores: network errors from third-party hosts we do not control (Drive
 * thumbnails rate-limiting is not a regression in this codebase).
 *
 * Run: node scripts/verify-runtime.mjs   [BASE=http://localhost:3200]
 */

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3200";
const PATHS = [
  "/",
  "/library",
  "/library?q=MAHA",
  "/library?kind=headshots&orientation=portrait",
  "/films",
  "/people",
  "/press",
  "/login",
];

/** Third-party hosts whose failures are not this repo's regressions. */
const THIRD_PARTY =
  /drive\.google\.com|player\.vimeo\.com|youtube(-nocookie)?\.com|i\.ytimg\.com|vumbnail|challenges\.cloudflare\.com/;

/**
 * Console noise the dev overlay itself emits while rendering an error, plus
 * React's `%c%d` style-formatting spam. Filtered so the REAL cause is what
 * gets printed — the first run of this check reported a Cloudflare challenge
 * request and two `%c%d` lines while saying nothing about the ReferenceError
 * that actually broke the page.
 */
const NOISE = /^%c%d|^%c |font-size:0;color:transparent/;

const browser = await chromium.launch();
let failures = 0;

for (const path of PATHS) {
  const page = await browser.newPage();
  const problems = [];

  page.on("pageerror", (err) => problems.push(`uncaught: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (THIRD_PARTY.test(text) || NOISE.test(text)) return;
    // A failed subresource logs a generic message with no useful detail; the
    // request-level listener below reports those with their URL instead.
    if (/Failed to load resource/.test(text)) return;
    problems.push(`console: ${text}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (THIRD_PARTY.test(url)) return;
    /**
     * An abort is the BROWSER's decision, not a server failure.
     *
     * Next speculatively prefetches every linked route as `?_rsc=…`, and
     * cancels those in flight when the page closes. Counting them made all
     * eight pages "fail" while every one of them was serving 200 — a check
     * that cries wolf gets ignored, which is worse than not having it.
     */
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    problems.push(`request failed: ${url} (${req.failure()?.errorText})`);
  });

  /**
   * `domcontentloaded` plus a fixed settle, NOT `networkidle`.
   *
   * The dev server holds an HMR websocket open and the Library lazy-loads
   * dozens of Drive thumbnails, so the network never goes idle and every page
   * but the landing one timed out. The settle window is what a client-side
   * error actually needs: effects run and throw well inside it.
   */
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  // 4s, not 2.5s. React surfaces an effect-thrown error asynchronously, and
  // at 2.5s this check saw a half-rendered page and reported only incidental
  // noise — it missed the very bug it was written for.
  await page.waitForTimeout(4000);

  // The dev overlay renders in a shadow root, so a text search of the page
  // body will not find it. Its host element is the reliable signal.
  const overlay = await page.locator("nextjs-portal").count();
  if (overlay > 0) {
    const text = await page.evaluate(() => {
      const host = document.querySelector("nextjs-portal");
      return host?.shadowRoot?.textContent?.replace(/\s+/g, " ").slice(0, 200) ?? "";
    });
    if (/error/i.test(text)) problems.push(`dev overlay: ${text}`);
  }

  /**
   * The most reliable signal of all, and the one to check first: when a client
   * error kills the render, Next replaces the whole body with "This page
   * couldn't load". No shadow-DOM spelunking, no timing race on `pageerror`.
   */
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
  if (/This page couldn.{0,3}t load/i.test(body)) {
    problems.push(`page failed to render: "${body.slice(0, 80)}"`);
  }
  // A page that renders nothing is a failure even without an error.
  const bodyLength = body.length;
  if (bodyLength < 200) problems.push(`body is nearly empty (${bodyLength} chars)`);

  if (problems.length) {
    failures++;
    console.log(`FAIL  ${path}`);
    for (const p of problems.slice(0, 5)) console.log(`        ${p}`);
  } else {
    console.log(`  ok  ${path}  (${bodyLength.toLocaleString()} chars rendered)`);
  }

  await page.close();
}

await browser.close();

console.log(`\n${failures === 0 ? "no client-side errors" : `${failures} page(s) FAILED`}`);
process.exit(failures ? 1 : 0);
