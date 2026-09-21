import { writeFile } from "node:fs/promises";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Copy the LIVE landing page down onto this database.
 *
 *   LIVE=https://your-host npx payload run scripts/pull-landing-from-live.ts
 *
 * `deploy-landing.ts` applies the composition captured in
 * `data/fampire/landing-layout.json`. That file is a snapshot, and the client
 * has edited the live page since it was taken — so a fresh clone comes up
 * showing a landing page the client would not recognise, and any judgement
 * made against it is a judgement of the wrong page.
 *
 * ── Why the relationships are dropped ──────────────────────────────────
 *
 * Relationship values are row ids, and row ids are per-database: person 4 is
 * not the same person in two installs. Carrying them across would attach the
 * wrong faces silently, which is worse than attaching none.
 *
 * Dropping them is safe here BECAUSE the live rows are materialised: every
 * card already carries its own picture URL, words and link, so `source` is a
 * fallback nothing is currently falling back to. Point a row at a local
 * record afterwards if you want the inheritance back.
 *
 *   DRY_RUN=1  to see what would change and write nothing.
 *   SNAPSHOT=1 to also refresh data/fampire/landing-layout.json.
 */

const LIVE = process.env.LIVE ?? "https://3-7-9-4.nip.io";
const DRY = process.env.DRY_RUN === "1";
const SNAPSHOT = process.env.SNAPSHOT === "1";

const res = await fetch(
  `${LIVE}/payload-api/pages?where[slug][equals]=${encodeURIComponent("/")}&limit=1&depth=0`,
  { headers: { "User-Agent": "fampire-pull-landing" } },
);
if (!res.ok) throw new Error(`${LIVE} answered ${res.status}`);
const live = (await res.json())?.docs?.[0];
if (!live?.layout?.length) throw new Error("the live site returned no landing layout");

/** Every field name in the block schema that holds a row id. */
const RELATIONSHIPS = new Set([
  "source", "person", "people", "crew", "rightsHolder", "brands", "brand",
  "films", "film", "hidden", "portraits", "image", "previewImage", "seoImage",
  "coverSubject", "issue", "event", "location", "tenant", "entries",
]);

/** Strip ids that mean nothing here, and the live row ids with them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clean(node: any): any {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "id") continue; // let this database mint its own row ids
    if (RELATIONSHIPS.has(k)) {
      out[k] = Array.isArray(v) ? [] : null;
      continue;
    }
    out[k] = clean(v);
  }
  return out;
}

const layout = clean(live.layout);

console.log(`live landing page: ${live.layout.length} blocks, updated ${live.updatedAt}`);
for (const [i, b] of layout.entries()) console.log(`  ${String(i + 1).padStart(2)}  ${b.blockType}`);

if (SNAPSHOT && !DRY) {
  await writeFile("data/fampire/landing-layout.json", JSON.stringify(layout, null, 2) + "\n");
  console.log("\nsnapshot refreshed: data/fampire/landing-layout.json");
}

if (DRY) {
  console.log("\n[DRY RUN] nothing written to this database");
  process.exit(0);
}

const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const page = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, draft: true, overrideAccess: true })
).docs[0];
if (!page) throw new Error("no page with slug '/' on this database");

await api.update({ collection: "pages", id: page.id, data: { layout }, depth: 0, overrideAccess: true });
// `update` on a drafts-enabled collection writes a DRAFT; without this the
// change is invisible on the very page you are looking at.
if (page._status === "published") {
  await api.update({ collection: "pages", id: page.id, data: { _status: "published" }, depth: 0, overrideAccess: true });
}

const after = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];
console.log(`\napplied — this database now renders ${(after.layout ?? []).length} blocks in the live order`);
process.exit(0);
