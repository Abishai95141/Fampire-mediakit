import config from "@payload-config";
import { getPayload } from "payload";
import { readFile } from "node:fs/promises";

/**
 * Put the landing page into the composition held in
 * `data/fampire/landing-layout.json`, on whatever database this runs against.
 *
 * ── Why a file rather than a sequence of scripts ────────────────────────
 *
 * The layout was arrived at over several passes, each of which nudged the
 * previous one. Replaying those passes against production would mean hoping
 * they compose to the same result on a database that started in a slightly
 * different state — and finding out on the live site if they did not. This
 * takes the composition that is actually running locally, verified, and
 * applies it as ONE value.
 *
 * ── Portability ────────────────────────────────────────────────────────
 *
 * The file carries `personSlugs`, never row ids. Payload relationship fields
 * store numeric ids, and those are per-database: person 1 is Anthony here and
 * need not be there. Slugs are the stable identity, so they are resolved
 * against the target database at apply time.
 *
 * ── Blast radius ───────────────────────────────────────────────────────
 *
 * ONLY the page whose slug is "/" is touched, and only its `layout`. Title,
 * SEO, status and every other page are left exactly as they are — this is a
 * landing-page swap, not a site rebuild. Re-running it is a no-op beyond
 * rewriting the same layout.
 *
 *   DRY_RUN=1 npx payload run scripts/deploy-landing.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const admin = (
  await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];
if (!admin) throw new Error("no admin user on this database");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const layout = JSON.parse(await readFile("data/fampire/landing-layout.json", "utf8")) as any[];

// Resolve people by slug against THIS database.
const people = await api.find({ collection: "people", limit: 500, depth: 0, overrideAccess: true });
const idFor = new Map(
  (people.docs as { id: number; slug: string }[]).map((p) => [p.slug, p.id]),
);

const missing: string[] = [];
for (const b of layout) {
  if (b.blockType !== "recapRow") continue;
  for (const r of b.recaps ?? []) {
    const slugs: string[] = r.personSlugs ?? [];
    delete r.personSlugs;
    const ids = slugs.map((s) => idFor.get(s)).filter((x) => x != null);
    for (const s of slugs) if (!idFor.has(s)) missing.push(s);
    // The link is optional metadata — a recap still renders without it, so a
    // missing person is reported, not fatal.
    r.person = ids;
  }
}
if (missing.length) console.log(`people not found on this database (link omitted): ${missing.join(", ")}`);

const page = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true, draft: true })
).docs[0];
if (!page) throw new Error("no page with slug '/'");

/**
 * MERGE, do not replace.
 *
 * This nearly shipped as a wholesale overwrite, and the comparison that
 * caught it is the reason it does not. Production was AHEAD of the captured
 * layout on two pieces of copy the client had corrected after the retrieval
 * audit — "In 2025 their influence reached national scale" (the captured
 * copy still said 2024, which was the reported error) and "Ten issues" (the
 * capture said Eight, the other reported error). Replacing the layout would
 * have silently reverted both fixes.
 *
 * So the split is: STRUCTURE comes from the file, CONTENT stays with the
 * database. Only the keys below decide how a block is presented; everything
 * else on an existing block — every heading, paragraph, label and link — is
 * whatever production already holds. A key the live block does not have at
 * all is additive and is taken from the file, since adding cannot destroy.
 */
const PRESENTATION = new Set(["layout", "dark", "rail", "marquee", "limit", "featuredCount"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = new Map<string, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
for (const b of (page.layout ?? []) as any[]) if (!live.has(b.blockType)) live.set(b.blockType, b);

const kept: string[] = [];
const forced: string[] = [];
for (const b of layout) {
  const cur = live.get(b.blockType);
  if (!cur) continue; // a brand-new block: take the file's version whole
  for (const k of Object.keys(b)) {
    if (k === "blockType") continue;
    if (PRESENTATION.has(k)) {
      if (JSON.stringify(cur[k]) !== JSON.stringify(b[k])) forced.push(`${b.blockType}.${k}`);
      continue; // keep the file's value
    }
    const hasLive = cur[k] !== undefined && cur[k] !== null && cur[k] !== "";
    if (hasLive) {
      if (JSON.stringify(cur[k]) !== JSON.stringify(b[k])) kept.push(`${b.blockType}.${k}`);
      b[k] = cur[k]; // the database wins on content
    }
  }
  // Row ids belong to this database; carrying the file's would orphan them.
  if (cur.id) b.id = cur.id;
}
if (kept.length) console.log(`  content kept from the live page: ${kept.join(", ")}`);
if (forced.length) console.log(`  presentation changed: ${forced.join(", ")}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const before = ((page.layout ?? []) as any[]).map((b) => b.blockType);
console.log(`page ${page.id} "${page.title}" — status ${page._status}`);
console.log(`  before (${before.length}): ${before.join(", ")}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.log(`  after  (${layout.length}): ${layout.map((b: any) => b.blockType).join(", ")}`);

if (DRY) {
  console.log("\n[DRY RUN] nothing written");
  process.exit(0);
}

await api.update({
  collection: "pages",
  id: page.id,
  data: { layout },
  depth: 0,
  overrideAccess: true,
  user: admin,
});

/**
 * Published, explicitly.
 *
 * `update` on a drafts-enabled collection writes a draft unless told
 * otherwise. Without this the new landing page would exist, look correct in
 * the admin preview, and be invisible to the public — the most confusing
 * possible outcome of a deploy that reported success.
 */
if (page._status === "published") {
  await api.update({
    collection: "pages",
    id: page.id,
    data: { _status: "published" },
    depth: 0,
    overrideAccess: true,
    user: admin,
  });
  console.log("  republished");
}

console.log("\nlanding page updated");
process.exit(0);
