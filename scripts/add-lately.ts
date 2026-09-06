import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Add "Lately" to the landing page — the three recap reels the client sent.
 *
 * Placed straight after the institution paragraph: the reader has just been
 * told what FAMPIRE is, and the obvious next question is what it has been
 * doing. Everything below that point is archive.
 *
 * The videos are LINKED, not uploaded. Only the Drive share URLs are stored;
 * the poster and the player are both derived from the file id at render time.
 *
 *   DRY_RUN=1 npx payload run scripts/add-lately.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (
  await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];

const people = await api.find({ collection: "people", where: { isFamily: { equals: true } }, limit: 20, depth: 0, overrideAccess: true });
const bySlug = new Map((people.docs as { id: number; slug: string }[]).map((p) => [p.slug, p.id]));

const lately = {
  blockType: "recapRow",
  heading: "Lately",
  intro: "What the family has been up to — a recap from each of them.",
  recaps: [
    {
      who: "Anthony",
      person: [bySlug.get("anthony")].filter(Boolean),
      blurb: "The founder's recap — where the work is now, in his own words.",
      when: "Latest",
      url: "https://drive.google.com/file/d/1PWfoXVTd7FOAvf1aWjTjbMY1Wjz4Z83E/view",
    },
    {
      who: "TereZa",
      person: [bySlug.get("tereza")].filter(Boolean),
      blurb: "The editor-in-chief's recap — the magazine, the films, the year so far.",
      when: "Latest",
      url: "https://drive.google.com/file/d/1T_91coRe0B4rCaPrKUPeFgCnJD5QF8OO/view",
    },
    {
      // One reel covers both children, so it is one card rather than two —
      // splitting it would mean showing the same video twice.
      who: "Love & Legend",
      person: [bySlug.get("love"), bySlug.get("legend")].filter(Boolean),
      blurb: "The correspondents' recap — reporting, interviewing, on set.",
      when: "Latest",
      url: "https://drive.google.com/file/d/1yjb8CEGsb5A7GmSekJvAixrOyRBeNEvp/view",
    },
  ],
};

const page = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true, draft: true })
).docs[0];
if (!page) throw new Error("no page with slug '/'");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cur = (page.layout ?? []) as any[];
// Idempotent: re-running replaces the row rather than stacking a second one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const without = cur.filter((b: any) => b.blockType !== "recapRow");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const next: any[] = [];
let placed = false;
for (const b of without) {
  next.push(b);
  if (!placed && b.blockType === "statement") {
    next.push(lately);
    placed = true;
  }
}
if (!placed) next.splice(2, 0, lately);

console.log(`blocks: ${next.length}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
next.forEach((b: any, i) => console.log(`  ${String(i + 1).padStart(2)}. ${b.blockType}${b.blockType === "recapRow" ? "   ← Lately" : ""}`));

if (!DRY) {
  await api.update({ collection: "pages", id: page.id, data: { layout: next }, depth: 0, overrideAccess: true, user: admin });
  console.log("\npage '/' updated");
} else {
  console.log("\n[DRY RUN] nothing written");
}
process.exit(0);
