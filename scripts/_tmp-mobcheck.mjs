import { chromium } from "playwright";
const B = process.argv[2] ?? "http://127.0.0.1:3200";
const b = await chromium.launch({ ignoreHTTPSErrors: true });
for (const [w,h,label] of [[390,844,"iPhone-390"],[360,800,"Android-360"],[768,1024,"tablet-768"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" });
  await p.mouse.click(w/2, 400); await p.waitForTimeout(2600);
  const before = await p.evaluate(() => ({ vw: document.documentElement.clientWidth, docW: document.documentElement.scrollWidth }));
  // scroll the whole page, collecting any element that escapes
  const bad = [];
  for (let i=0;i<16;i++){ await p.mouse.wheel(0,700); await p.waitForTimeout(120); }
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth; const out = [];
    for (const e of document.querySelectorAll(".zeen *")) {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      if (b.right > vw + 1 || b.left < -1) {
        let clipped=false;
        for (let n=e.parentElement;n;n=n.parentElement){const o=getComputedStyle(n);
          if(o.overflowX==="hidden"||o.overflow==="hidden"||o.overflowX==="clip"){clipped=true;break;}}
        if(!clipped) out.push((e.className||"").toString().slice(0,40));
      }
    }
    // gutter check: is body copy actually inset from the edge?
    const wrap = document.querySelector(".z-wrap");
    const wr = wrap ? wrap.getBoundingClientRect() : null;
    return { escaping: [...new Set(out)].slice(0,5), docW: document.documentElement.scrollWidth, vw,
             wrapLeft: wr ? Math.round(wr.left) : null, wrapW: wr ? Math.round(wr.width) : null };
  });
  console.log(`${label}: vw=${r.vw} docW=${r.docW} sideScroll=${r.docW>r.vw+1} wrapLeft=${r.wrapLeft} wrapW=${r.wrapW} escaping=${r.escaping.length ? r.escaping.join("|") : "none"}`);
  await p.screenshot({ path: `docs/landing-tour/MOB-${label}.png` });
  await ctx.close();
}
await b.close();
