#!/usr/bin/env node
/**
 * FAMPIRE CMS walkthrough recorder.
 *
 * Drives a real browser through the actual admin — sign in, tour the
 * sidebar, edit a collection, add one, delete one, edit a film and a
 * person, edit a page with live preview open, add a press article, tour
 * settings — and records it as a training video for the client. A fixed
 * caption bar at the bottom names the current chapter and step as it
 * happens, the same way a screencast narrator would.
 *
 * Every "edit" chapter nets to zero permanent change: it types a visible
 * edit, shows the save, then reverts to the original value before the
 * final save. Only entries explicitly labelled "Walkthrough Demo" are
 * created — and those are deleted again during the delete/cleanup
 * chapters. Re-running this script leaves the database exactly as it
 * found it.
 *
 * Output (docs/cms-walkthrough/output/, gitignored — regenerate, don't
 * commit the binary):
 *   fampire-cms-walkthrough.mp4   the video, with the index burned in
 *   fampire-cms-walkthrough.vtt   a matching subtitle track
 *   INDEX.md                      the same chapter index as a doc
 *
 * Prerequisites:
 *   - The dev server running at WALKTHROUGH_BASE_URL (default
 *     http://localhost:3200) against a database you're fine mutating.
 *     Never point this at production.
 *   - An admin login. Create one cheaply with:
 *       npx payload run scripts/create-demo-admin.ts
 *     which makes walkthrough-demo@fampire.local / WalkthroughDemo!2026 —
 *     override via WALKTHROUGH_EMAIL / WALKTHROUGH_PASSWORD if you'd
 *     rather use a real account.
 *   - ffmpeg on PATH (concatenates the intro card onto the recording and
 *     transcodes Chromium's webm to mp4).
 *
 * Run:
 *   node scripts/cms-walkthrough.mjs
 */

import { chromium } from "playwright";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const BASE = process.env.WALKTHROUGH_BASE_URL ?? "http://localhost:3200";
const EMAIL = process.env.WALKTHROUGH_EMAIL ?? "walkthrough-demo@fampire.local";
const PASSWORD = process.env.WALKTHROUGH_PASSWORD ?? "WalkthroughDemo!2026";
const OUT_DIR = path.resolve("docs/cms-walkthrough/output");
const WORK_DIR = path.join(OUT_DIR, ".work");
const VIEWPORT = { width: 1440, height: 900 };
const INTRO_DURATION_MS = 10_000;
const TOTAL_CHAPTERS = 12;

// ── The on-screen caption bar ───────────────────────────────────────────
//
// Injected as a sibling of Next's mount root so client-side admin
// navigation never unmounts it. `window.__setCaption` is how the recorder
// updates it between steps.
function installBanner() {
  // addInitScript runs the moment a new document is created — before the
  // parser has even reached <body>. Calling document.body.appendChild
  // synchronously here throws on every navigation (silently: init-script
  // errors don't fail the page load, they just mean the banner never
  // appears). Defer the actual DOM work until body exists, and buffer any
  // caption set before that so it isn't lost.
  let pending = null;
  function paint(chapter, step, idx, total) {
    const c = document.getElementById("wt-chapter");
    if (!c) { pending = [chapter, step, idx, total]; return; }
    c.textContent = chapter;
    document.getElementById("wt-step").textContent = step;
    document.getElementById("wt-progress").textContent = idx ? `CHAPTER ${idx} / ${total}` : "";
  }
  window.__setCaption = (chapter, step, idx, total) => paint(chapter, step, idx, total);

  function inject() {
    if (document.getElementById("walkthrough-banner")) return;
    const bar = document.createElement("div");
    bar.id = "walkthrough-banner";
    bar.style.cssText = [
      "position:fixed", "left:0", "right:0", "bottom:0", "z-index:2147483647",
      "background:#0b0b0c", "color:#fff", "font-family:-apple-system,Helvetica,Arial,sans-serif",
      "padding:14px 28px 16px", "border-top:2px solid #fff", "pointer-events:none",
      "box-shadow:0 -6px 24px rgba(0,0,0,.35)",
    ].join(";");
    bar.innerHTML = `
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:24px;max-width:1392px;margin:0 auto;padding-left:56px">
        <div style="min-width:0">
          <div id="wt-chapter" style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
          <div id="wt-step" style="font-size:15px;color:#d8d8da;line-height:1.35;max-width:1000px"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <div id="wt-progress" style="font-size:11px;font-weight:600;letter-spacing:.08em;color:#8a8a8e;white-space:nowrap"></div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.1em;color:#fff;border:1px solid #444;padding:4px 8px">FAMPIRE</div>
        </div>
      </div>`;
    document.body.appendChild(bar);
    if (pending) paint(...pending);
  }
  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject, { once: true });
}

// ── Recorder: tracks captions + elapsed time, drives the banner ────────
class Recorder {
  constructor(page) {
    this.page = page;
    this.t0 = Date.now();
    this.events = []; // { t, chapter, step, isChapterStart }
    this.chapterIdx = 0;
    this.chapterLabel = "";
  }
  async chapter(label) {
    this.chapterIdx += 1;
    this.chapterLabel = label;
    await this.say(label, true);
  }
  async say(step, isChapterStart = false) {
    const chapter = isChapterStart ? step : this.chapterLabel;
    const stepText = isChapterStart ? "" : step;
    const t = Date.now() - this.t0;
    this.events.push({ t, chapter, step: stepText, isChapterStart });
    await this.page.evaluate(
      ([c, s, i, n]) => {
        if (typeof window.__setCaption !== "function") return;
        window.__setCaption(c, s, i, n);
      },
      [chapter, stepText, this.chapterIdx, TOTAL_CHAPTERS],
    );
  }
  async hold(ms) {
    await this.page.waitForTimeout(ms);
  }
}

// ── Small Payload admin helpers ─────────────────────────────────────────
async function field(page, name) {
  return page.locator(`#field-${name}`);
}
async function fillField(page, name, value) {
  const el = page.locator(`#field-${name}`);
  await el.click();
  await el.fill(value);
}
async function typeIntoField(page, name, text, delay = 35) {
  const el = page.locator(`#field-${name}`);
  await el.click();
  await el.pressSequentially(text, { delay });
}
async function clearAndType(page, name, text, delay = 25) {
  const el = page.locator(`#field-${name}`);
  await el.click();
  await el.fill("");
  await el.pressSequentially(text, { delay });
}
async function pickReactSelect(page, name, optionText) {
  await page.locator(`#field-${name}`).click();
  await page.locator(".rs__option", { hasText: optionText }).first().click();
}
// Payload mixes real <button>s with <a> links for the same-looking actions
// ("Create New" is a link on a list view, a button inside a document's ⋮
// menu) — match on exact visible text across either rather than on role.
async function clickButton(page, text) {
  await page.getByText(text, { exact: true }).first().click();
}

function mmss(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function vttTimestamp(ms) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const msRem = Math.floor(total % 1000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(msRem, 3)}`;
}

// ── Main walkthrough ────────────────────────────────────────────────────
async function recordWalkthrough(walkDir) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: walkDir, size: VIEWPORT },
  });
  await context.addInitScript(installBanner);
  const page = await context.newPage();
  const rec = new Recorder(page);

  // 1 — Sign in ------------------------------------------------------
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await rec.chapter("01 — Signing in");
  await rec.hold(600);
  await rec.say("This is the CMS login. Every edit on the site happens here.");
  await rec.hold(1800);
  await fillField(page, "email", EMAIL);
  await rec.hold(400);
  await field(page, "password").then((l) => l.click());
  await page.locator("#field-password").fill(PASSWORD);
  await rec.hold(400);
  await clickButton(page, "Login");
  await page.waitForURL(/\/admin($|\/)/, { timeout: 15_000 });
  await rec.hold(1200);

  // 2 — Orientation ----------------------------------------------------
  await rec.chapter("02 — Finding your way around");
  await rec.say("The sidebar is five groups. Settings, Library, Stories, Pages, Who & What.");
  await rec.hold(2600);
  await rec.say("Library is the 600-collection catalog. Pages is the five site pages. Everything else is people, films and press material.");
  await rec.hold(3200);

  // 3 — Library: anatomy of a collection --------------------------------
  await rec.chapter("03 — Library: editing an existing collection");
  await page.goto(`${BASE}/admin/collections/entries`, { waitUntil: "domcontentloaded" });
  await rec.say("Collections is the library — every catalog item lives here.");
  await rec.hold(2400);
  const row = page.getByRole("link", { name: /From Fat Lolli to 6 Pack Lolli/i }).first();
  await row.click();
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  await rec.say("Every collection has the same five tabs — Content, Facets, Safety, Health, Provenance.");
  await rec.hold(2600);
  await rec.say("Title, description, kind and the link back to the client's storage live on Content.");
  await rec.hold(2600);

  const originalDescription = await page.locator("#field-description").inputValue();
  await rec.say("Editing is just typing in the field, the same as any form.");
  await rec.hold(1400);
  await typeIntoField(page, "description", " — updated for the walkthrough");
  await rec.hold(1400);
  await rec.say("Save Draft keeps a change private until you're ready — it never touches the public site.");
  await rec.hold(2200);
  await clickButton(page, "Save Draft");
  await rec.hold(1600);
  await rec.say("Publish changes is the one that goes live.");
  await rec.hold(1800);
  // revert to the original value, then publish that — net zero change.
  await clearAndType(page, "description", originalDescription);
  await rec.hold(600);
  await clickButton(page, "Publish changes");
  await rec.hold(1800);

  // 4 — Library: adding a new collection --------------------------------
  await rec.chapter("04 — Library: adding a new collection");
  await page.goto(`${BASE}/admin/collections/entries`, { waitUntil: "domcontentloaded" });
  await rec.say("Create New — a new collection needs exactly four things.");
  await rec.hold(2000);
  await clickButton(page, "Create New");
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  await rec.say("A title people will recognize, a one-line description, the kind of asset it is, and the link to where it lives.");
  await rec.hold(3200);
  await fillField(page, "title", "Walkthrough Demo — Add Example");
  await rec.hold(500);
  await fillField(page, "slug", "walkthrough-demo-add-example");
  await rec.hold(500);
  await fillField(page, "description", "A placeholder collection created for the CMS training video.");
  await rec.hold(500);
  await pickReactSelect(page, "kind", "b-roll");
  await rec.hold(500);
  await fillField(page, "url", "https://drive.google.com/drive/folders/0000000000000000000000000");
  await rec.hold(800);
  await rec.say("Nothing here ever migrates the client's files — this is a link plus metadata, always.");
  await rec.hold(2600);
  await clickButton(page, "Save Draft");
  await rec.hold(1800);

  // 5 — Library: deleting a collection ----------------------------------
  await rec.chapter("05 — Library: deleting a collection");
  await rec.say("The same collection, from the ⋮ menu next to Save.");
  await rec.hold(2000);
  await page.locator("button.popup-button").first().click();
  await rec.hold(900);
  await rec.say("Delete asks for a real confirmation — it's the one action here that isn't reversible.");
  await rec.hold(2400);
  await clickButton(page, "Delete");
  await rec.hold(700);
  await clickButton(page, "Confirm");
  await rec.hold(1600);

  // 6 — Who & What: Films -------------------------------------------------
  await rec.chapter("06 — Who & What: editing a film");
  await page.goto(`${BASE}/admin/collections/films`, { waitUntil: "domcontentloaded" });
  await rec.say("Films holds the slate — synopsis, poster, awards, where to watch.");
  await rec.hold(2400);
  await page.getByRole("link", { name: "The New Woo", exact: true }).click();
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  const originalSynopsis = await page.locator("#field-synopsis").inputValue();
  await rec.say("Synopsis is the paragraph readers see on the film's page.");
  await rec.hold(2000);
  await typeIntoField(page, "synopsis", " (edited live in this walkthrough)");
  await rec.hold(1200);
  await rec.say("Poster Url or Poster Image overrides the cover this film shows everywhere on the site.");
  await rec.hold(2600);
  await clearAndType(page, "synopsis", originalSynopsis);
  await rec.hold(500);
  await clickButton(page, "Save");
  await rec.hold(1600);

  // 7 — Who & What: People -------------------------------------------------
  await rec.chapter("07 — Who & What: editing a person");
  await page.goto(`${BASE}/admin/collections/people`, { waitUntil: "domcontentloaded" });
  await rec.say("People works the same way — name, role, bio, portrait.");
  await rec.hold(2200);
  await page.getByRole("link", { name: "Anthony Lolli", exact: true }).click();
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  await rec.say("One hard rule lives right on this form: TereZa is always spelled with a capital Z.");
  await rec.hold(2800);
  const originalBio = await page.locator("#field-bio").inputValue();
  await typeIntoField(page, "bio", " (edited live in this walkthrough)");
  await rec.hold(1200);
  await clearAndType(page, "bio", originalBio);
  await rec.hold(500);
  await clickButton(page, "Save");
  await rec.hold(1600);

  // 8 — Pages -------------------------------------------------------------
  await rec.chapter("08 — Pages: editing a block, with live preview");
  await page.goto(`${BASE}/admin/collections/pages`, { waitUntil: "domcontentloaded" });
  await rec.say("The whole site is five pages — the landing page, Library, Films, People and Press.");
  await rec.hold(2600);
  await page.getByRole("link", { name: "Press", exact: true }).click();
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  await rec.say("Every page is a stack of blocks. Add, remove or reorder them — nothing here needs a developer.");
  await rec.hold(3000);
  const showPreview = page.locator('button[aria-label="Show Live Preview"]').first();
  if (await showPreview.isVisible().catch(() => false)) {
    await showPreview.click();
    await rec.hold(1200);
  }
  await rec.say("Live preview on the right is the real site, updating as you type on the left.");
  await rec.hold(2800);

  // 9 — Stories: Articles ---------------------------------------------------
  await rec.chapter("09 — Stories: adding press material");
  await page.goto(`${BASE}/admin/collections/articles`, { waitUntil: "domcontentloaded" });
  await rec.say("Stories is press releases, magazine issues and public appearances.");
  await rec.hold(2400);
  await clickButton(page, "Create New");
  await page.waitForLoadState("domcontentloaded");
  await rec.hold(800);
  await fillField(page, "title", "Walkthrough Demo — Sample Press Release");
  await rec.hold(500);
  await fillField(page, "slug", "walkthrough-demo-sample-press-release");
  await rec.hold(800);
  await rec.say("Save Draft — a demo like this never has to go public.");
  await rec.hold(2000);
  await clickButton(page, "Save Draft");
  await rec.hold(1600);
  // Clean up: delete the demo article immediately after showing the save.
  await page.locator("button.popup-button").first().click();
  await rec.hold(600);
  await clickButton(page, "Delete");
  await rec.hold(600);
  await clickButton(page, "Confirm");
  await rec.hold(1400);

  // 10 — Settings -----------------------------------------------------------
  await rec.chapter("10 — Settings: navigation, footer and brands");
  await page.goto(`${BASE}/admin/collections/site-settings`, { waitUntil: "domcontentloaded" });
  await rec.say("The masthead links, footer links and search placeholder — all editable here.");
  await rec.hold(2800);
  await page.goto(`${BASE}/admin/collections/brands`, { waitUntil: "domcontentloaded" });
  await rec.say("Brands is the filter for the eight worlds — Biohack Yourself, Lolli Brands and the rest. It's a label, not a gate.");
  await rec.hold(3000);

  // 11 — The safety rule ------------------------------------------------------
  await rec.chapter("11 — The one rule the system enforces for you");
  await page.goto(`${BASE}/admin/collections/entries`, { waitUntil: "domcontentloaded" });
  await rec.say("Any collection that features Love or Legend Lolli is flagged automatically.");
  await rec.hold(2800);
  await rec.say("It cannot go live until a person explicitly confirms it on the Safety tab. The system will not let this be skipped.");
  await rec.hold(3400);

  // 12 — Wrap-up ----------------------------------------------------------
  await rec.chapter("12 — That's the whole system");
  await rec.say("Five page types, one rule you can't bypass, and every edit is either a draft or live — never in between.");
  await rec.hold(3400);

  await context.close();
  const videoPath = await page.video().path();
  await browser.close();
  return { videoPath, events: rec.events };
}

// ── Intro / index card ──────────────────────────────────────────────────
function introHtml(rows) {
  const items = rows
    .map(
      (r) => `
      <div style="display:flex;gap:22px;align-items:baseline;padding:10px 0;border-bottom:1px solid #232326">
        <div style="font-variant-numeric:tabular-nums;font-size:15px;color:#8a8a8e;width:64px;flex-shrink:0">${r.time}</div>
        <div style="font-size:16px;color:#f2f2f3">${r.label}</div>
      </div>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin:0; background:#0b0b0c; font-family:-apple-system,Helvetica,Arial,sans-serif; }
    .wrap { max-width:1000px; margin:0 auto; padding:64px 48px; }
  </style></head><body>
    <div class="wrap">
      <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8a8a8e;margin-bottom:14px">FAMPIRE MEDIA CENTER</div>
      <div style="font-size:44px;font-weight:800;color:#fff;line-height:1.05;margin-bottom:10px">The CMS, start to finish</div>
      <div style="font-size:17px;color:#b8b8bb;margin-bottom:36px;max-width:720px">
        Everything you need to run the library, the pages, the people and film
        records, and the press material — no developer required.
      </div>
      <div>${items}</div>
    </div>
  </body></html>`;
}

async function recordIntro(introDir, rows) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: introDir, size: VIEWPORT } });
  const page = await context.newPage();
  await page.setContent(introHtml(rows));
  await page.waitForTimeout(INTRO_DURATION_MS);
  await context.close();
  const videoPath = await page.video().path();
  await browser.close();
  return videoPath;
}

// ── ffmpeg glue ──────────────────────────────────────────────────────────
async function concatAndTranscode(introPath, walkPath, outMp4) {
  const listFile = path.join(WORK_DIR, "concat.txt");
  await writeFile(
    listFile,
    `file '${path.resolve(introPath)}'\nfile '${path.resolve(walkPath)}'\n`,
  );
  const concatWebm = path.join(WORK_DIR, "concat.webm");
  try {
    await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", concatWebm]);
  } catch {
    // Stream copy failed (codec/param mismatch) — re-encode both into one stream instead.
    await execFileAsync("ffmpeg", [
      "-y", "-i", introPath, "-i", walkPath,
      "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]",
      "-map", "[v]", "-c:v", "libvpx", concatWebm,
    ]);
  }
  await execFileAsync("ffmpeg", [
    "-y", "-i", concatWebm,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", outMp4,
  ]);
}

// ── VTT + index doc ──────────────────────────────────────────────────────
function buildVtt(events, offsetMs) {
  const cues = [
    { start: 0, end: offsetMs, text: "FAMPIRE Media Center — the CMS, start to finish. Index follows." },
    ...events.map((e, i) => {
      const start = offsetMs + e.t;
      const next = events[i + 1] ? offsetMs + events[i + 1].t : start + 4000;
      const end = Math.max(start + 1200, Math.min(next, start + 8000));
      const text = e.isChapterStart ? e.chapter : e.step;
      return { start, end, text };
    }),
  ].filter((c) => c.text);
  const body = cues
    .map((c) => `${vttTimestamp(c.start)} --> ${vttTimestamp(c.end)}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

function buildIndexMd(chapterRows, generatedAt) {
  const rows = chapterRows.map((r) => `| ${r.time} | ${r.label} |`).join("\n");
  return `# FAMPIRE CMS Walkthrough — Index

Generated ${generatedAt}. Video: \`fampire-cms-walkthrough.mp4\`. Captions: \`fampire-cms-walkthrough.vtt\`.

| Timestamp | Chapter |
| --- | --- |
${rows}

## Re-recording this

The CMS changes over time — re-run this after any admin UI change so the
video stays accurate.

1. Have the dev server running against a database you're fine mutating
   (never production): \`npm run dev\`
2. Make sure a login exists: \`npx payload run scripts/create-demo-admin.ts\`
3. \`node scripts/cms-walkthrough.mjs\`

Every edit chapter reverts its change before saving — the only rows the
script adds or removes are the ones explicitly labelled "Walkthrough
Demo", and it deletes those itself before finishing. Re-running it is
always safe.
`;
}

// ── Orchestration ─────────────────────────────────────────────────────────
async function main() {
  await mkdir(WORK_DIR, { recursive: true });
  const walkDir = path.join(WORK_DIR, "walk");
  const introDir = path.join(WORK_DIR, "intro");
  await mkdir(walkDir, { recursive: true });
  await mkdir(introDir, { recursive: true });

  console.log(`recording walkthrough against ${BASE} …`);
  const { videoPath: walkRaw, events } = await recordWalkthrough(walkDir);
  console.log(`walkthrough recorded: ${mmss(events.at(-1)?.t ?? 0)} of content`);

  const chapterRows = events
    .filter((e) => e.isChapterStart)
    .map((e) => ({ time: mmss(INTRO_DURATION_MS + e.t), label: e.chapter }));
  chapterRows.unshift({ time: "00:00", label: "Index (this list)" });

  console.log("recording intro / index card …");
  const introRaw = await recordIntro(introDir, chapterRows);

  await mkdir(OUT_DIR, { recursive: true });
  const outMp4 = path.join(OUT_DIR, "fampire-cms-walkthrough.mp4");
  console.log("concatenating + transcoding with ffmpeg …");
  await concatAndTranscode(introRaw, walkRaw, outMp4);

  const vtt = buildVtt(events, INTRO_DURATION_MS);
  await writeFile(path.join(OUT_DIR, "fampire-cms-walkthrough.vtt"), vtt);

  const indexMd = buildIndexMd(chapterRows, new Date().toISOString().slice(0, 10));
  await writeFile(path.join(OUT_DIR, "INDEX.md"), indexMd);

  await rm(WORK_DIR, { recursive: true, force: true });

  console.log(`done → ${OUT_DIR}`);
  console.log(chapterRows.map((r) => `  ${r.time}  ${r.label}`).join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
