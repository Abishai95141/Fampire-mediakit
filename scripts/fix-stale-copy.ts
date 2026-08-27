import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Two factual errors in published page copy.
 *
 *  1. The Institution paragraph opens "In 2024" and then dates the MAHA
 *     Inaugural Ball to 20 January 2025 in the same sentence. The ball was
 *     inauguration day, 2025; the year is simply wrong.
 *  2. The magazine shelf says "Eight issues" while the issue facet runs to
 *     #10. (Worth knowing separately: the Magazine Issues collection itself
 *     is empty — the shelf renders entries tagged `magazine`, so this line
 *     is hand-written copy with no record behind it.)
 *
 *   DRY_RUN=1 npx payload run scripts/fix-stale-copy.ts
 */
const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })).docs[0];

const pages = await api.find({ collection: "pages", limit: 50, depth: 0, overrideAccess: true, draft: true });
let changed = 0;

for (const page of pages.docs as Record<string, unknown>[]) {
  const layout = (page.layout ?? []) as Record<string, unknown>[];
  let touched = false;
  const next = layout.map((b) => {
    const o = { ...b };
    if (typeof o.secondary === "string" && o.secondary.includes("In 2024") && o.secondary.includes("January 2025")) {
      o.secondary = o.secondary.replace("In 2024", "In 2025");
      touched = true;
      console.log(`  statement → "${String(o.secondary).slice(0, 70)}…"`);
    }
    if (typeof o.aside === "string" && /\bEight issues\b/.test(o.aside)) {
      o.aside = o.aside.replace(/\bEight issues\b/, "Ten issues");
      touched = true;
      console.log(`  magazine aside → "${o.aside}"`);
    }
    return o;
  });
  if (!touched) continue;
  changed += 1;
  if (!DRY) {
    await api.update({
      collection: "pages", id: page.id, data: { layout: next },
      depth: 0, overrideAccess: true, user: admin, draft: page._status !== "published",
    });
  }
}
console.log(`${DRY ? "[DRY RUN] " : ""}pages updated: ${changed}`);
process.exit(0);
