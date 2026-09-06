import { chromium } from "playwright";
const B = process.argv[2] ?? "http://127.0.0.1:3200";
const b = await chromium.launch({ ignoreHTTPSErrors: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto(B, { waitUntil: "networkidle" });
await p.mouse.click(195, 400); await p.waitForTimeout(2800);
for (let i=0;i<10;i++){ await p.mouse.wheel(0,600); await p.waitForTimeout(120); }
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, offenders: [] };
  for (const e of document.querySelectorAll("body *")) {
    const b = e.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    // right edge past the viewport, or left edge before it
    if (b.right > vw + 1 || b.left < -1) {
      // does an ancestor clip it?
      let clipped = false;
      for (let n = e.parentElement; n; n = n.parentElement) {
        const o = getComputedStyle(n);
        if (o.overflowX === "hidden" || o.overflow === "hidden" || o.overflowX === "clip") { clipped = true; break; }
      }
      if (clipped) continue;
      out.offenders.push({ tag: e.tagName, cls: (e.className||"").toString().slice(0,58), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) });
    }
  }
  out.offenders = out.offenders.slice(0, 12);
  return out;
});
console.log(JSON.stringify(r, null, 1));
await p.screenshot({ path: "docs/landing-tour/MOB-before.png", fullPage: false });
await b.close();
