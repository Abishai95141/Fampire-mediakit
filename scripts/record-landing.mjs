/**
 * Record a scroll-through of the landing page, and shoot a full visual pass
 * on the way.
 *
 *   node scripts/record-landing.mjs [baseUrl]
 *
 * Produces, under docs/landing-tour/:
 *   fampire-landing.webm   the video
 *   NN-<section>.png       one full-quality still per section
 *   report.json            geometry checks per section
 *
 * Why Playwright rather than the editor's own browser pane: the pane keeps
 * going hidden in this environment, and a hidden pane returns black frames —
 * so every screenshot taken through it was unusable. This drives its own
 * Chromium at a fixed 1440x900, which also makes the pass reproducible.
 *
 * The cursor is drawn by the page, not by the OS. Playwright's real pointer
 * leaves no trace in a recording, so a small dot follows every synthetic mouse
 * event; hover states still fire from the genuine `mouse.move` underneath it.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3200";
const OUT = path.resolve("docs/landing-tour");
const VIEW = { width: 1440, height: 900 };

/** A visible cursor, injected into the page. */
const CURSOR = `
(() => {
  const d = document.createElement('div');
  d.id = '__tour_cursor';
  Object.assign(d.style, {
    position: 'fixed', zIndex: 2147483647, left: '0px', top: '0px',
    width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px',
    borderRadius: '50%', pointerEvents: 'none',
    background: 'rgba(18,18,18,.82)', boxShadow: '0 0 0 3px rgba(255,255,255,.9), 0 2px 10px rgba(0,0,0,.3)',
    transition: 'transform .12s ease-out', willChange: 'transform'
  });
  document.documentElement.appendChild(d);
  window.__tourMove = (x, y) => { d.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__tourClick = () => { d.style.background = 'rgba(18,18,18,.4)';
    setTimeout(() => d.style.background = 'rgba(18,18,18,.82)', 180); };
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: VIEW },
    // The tour must show the page as designed, not a reduced-motion variant —
    // the fanned deck and the scroll reveals are half the thing being shown.
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();

  // Keep the cursor alive through client-side navigation.
  await page.addInitScript(CURSOR);

  const move = async (x, y, steps = 24) => {
    await page.mouse.move(x, y, { steps });
    await page.evaluate(([a, b]) => window.__tourMove?.(a, b), [x, y]);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(1200);

  // The site opens behind a curtain: "click anywhere to enter".
  await move(VIEW.width / 2, VIEW.height / 2);
  await page.evaluate(() => window.__tourClick?.());
  await page.mouse.click(VIEW.width / 2, VIEW.height / 2);
  await sleep(2600);

  // Lenis smooth-scrolls, so nudging the wheel repeatedly gives a natural
  // glide; page.evaluate(scrollTo) would fight it and jump.
  const wheel = async (dy, times, gap = 90) => {
    for (let i = 0; i < times; i++) {
      await page.mouse.wheel(0, dy);
      await sleep(gap);
    }
  };

  const report = [];
  const sections = await page.evaluate(() => {
    const z = document.querySelector(".zeen");
    return [...z.children].map((c, i) => {
      const r = c.getBoundingClientRect();
      const h = c.querySelector("h1,h2,h3,p");
      return {
        i,
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
        label: (h?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40) || "section",
      };
    });
  });

  let shot = 0;
  for (const s of sections) {
    // Glide to the section rather than jumping, so the recording reads as
    // someone reading the page.
    const target = Math.max(0, s.top - 40);
    const current = await page.evaluate(() => window.scrollY);
    const delta = target - current;
    const steps = Math.max(1, Math.round(Math.abs(delta) / 180));
    await wheel(Math.sign(delta) * 180, steps, 70);
    await sleep(900);

    // Drift the cursor across the section so the video has some life, and so
    // hover states (the roster, the accordion) actually fire.
    await move(420, 300, 18);
    await sleep(350);
    await move(980, 520, 22);
    await sleep(450);

    const name = `${String(++shot).padStart(2, "0")}-${s.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 34)}`;
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });

    // Geometry the eye would catch: anything wider than the viewport, any
    // picture that failed, and any text sitting under an image.
    const checks = await page.evaluate(() => {
      const vw = window.innerWidth;
      /* Wider than the viewport only counts if NOTHING above it clips. The
         brand marquee is deliberately 2x the viewport inside an
         overflow-hidden parent, and checking the element's own overflow
         flagged it on every single section. */
      const clipped = (e) => {
        for (let n = e.parentElement; n; n = n.parentElement) {
          const o = getComputedStyle(n);
          if (o.overflowX === "hidden" || o.overflow === "hidden") return true;
        }
        return false;
      };
      const wide = [...document.querySelectorAll(".zeen *")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > vw + 4 && r.height > 0 && !clipped(e);
        })
        .map((e) => (e.className || "").toString().slice(0, 40));
      const broken = [...document.querySelectorAll("img")]
        .filter((i) => i.complete && i.naturalWidth === 0).length;
      // text visually behind an image
      const imgs = [...document.querySelectorAll(".zeen img")].map((i) => i.getBoundingClientRect());
      /* Text only counts as buried if it is genuinely readable-on-photo:
         overlapping an image AND having no opaque surface of its own between
         it and that image. The people card deliberately LIES ACROSS its
         portrait, and it is a solid panel — flagging that is noise, not a
         finding. */
      const onOpaque = (e) => {
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          const bg = getComputedStyle(n).backgroundColor;
          const m = bg.match(/rgba?\(([^)]+)\)/);
          if (m) {
            const parts = m[1].split(",").map((x) => parseFloat(x));
            if (parts.length < 4 || parts[3] > 0.85) return true;
          }
        }
        return false;
      };
      const buried = [...document.querySelectorAll(".zeen p, .zeen h1, .zeen h2, .zeen h3")]
        .filter((t) => {
          const r = t.getBoundingClientRect();
          if (r.height === 0 || r.bottom < 0 || r.top > innerHeight) return false;
          if (onOpaque(t)) return false;
          return imgs.some(
            (m) => !(m.right < r.left || m.left > r.right || m.bottom < r.top || m.top > r.bottom),
          );
        })
        .map((t) => (t.innerText || "").slice(0, 34));
      return { wideCount: wide.length, wide: wide.slice(0, 3), broken, buried: buried.slice(0, 4) };
    });
    report.push({ shot: name, ...s, ...checks });
    console.log(
      `  ${name.padEnd(38)} h=${String(s.height).padStart(5)}  wide=${checks.wideCount}  broken=${checks.broken}  buried=${checks.buried.length}`,
    );
  }

  // Settle at the foot of the page so the video ends on the closing statement.
  await wheel(200, 6, 80);
  await sleep(1500);

  await page.close();
  const video = page.video();
  const src = await video?.path();
  await context.close();
  await browser.close();

  if (src) {
    const { rename } = await import("node:fs/promises");
    const dest = path.join(OUT, "fampire-landing.webm");
    await rename(src, dest).catch(() => {});
    console.log(`\nvideo  → ${dest}`);
  }
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const bad = report.filter((r) => r.wideCount || r.broken || r.buried.length);
  console.log(`stills → ${OUT}  (${report.length})`);
  console.log(bad.length ? `\nFLAGGED ${bad.length} section(s):` : "\nno geometry problems found");
  for (const b of bad) {
    console.log(`  ${b.shot}: wide=${b.wide.join("|")} broken=${b.broken} buried=${b.buried.join(" / ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
