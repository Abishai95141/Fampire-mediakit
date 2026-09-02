import config from "@payload-config";
import { getPayload } from "payload";

/**
 * The slate through the accordion, and the press log as the numbered
 * progression on the near-black band.
 *
 * Both sections were rendering the house style under a larger heading — a
 * poster wall and a list of rows — which is the part of the page that still
 * looked unfinished beside the sections that had been given real layouts.
 *
 *   DRY_RUN=1 npx payload run scripts/apply-slate-and-log.ts
 */
const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })).docs[0];
const page = (await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true, draft: true })).docs[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const next = ((page.layout ?? []) as any[]).map((b) => {
  if (b.blockType === "filmStrip") {
    return { ...b, layout: "accordion", heading: b.heading || "The slate", dark: false };
  }
  if (b.blockType === "pressList") {
    /* Dark, because the page needs a second near-black band in its lower half
       — otherwise everything after the institution paragraph is one unbroken
       white run. Six is what the progression can carry before the numbering
       stops meaning anything; the full log is one click away. */
    return { ...b, layout: "progression", dark: true, limit: 6, heading: b.heading || "The press" };
  }
  return b;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
next.forEach((b: any, i) =>
  console.log(`  ${String(i + 1).padStart(2)}. ${b.blockType}${b.layout ? `  [${b.layout}]` : ""}${b.dark ? "  DARK" : ""}`));

if (!DRY) {
  await api.update({ collection: "pages", id: page.id, data: { layout: next }, depth: 0, overrideAccess: true, user: admin });
  console.log("\npage '/' updated");
} else console.log("\n[DRY RUN]");
process.exit(0);
