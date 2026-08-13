import config from "@payload-config";
import { getPayload, type Where } from "payload";

import type { Entry } from "@/payload-types";

/**
 * `slug` and `sourcePlatform` are required in the schema and are filled by the
 * beforeValidate hook. Omitting them here is the POINT of the test — if the
 * hook regresses, the create throws — but the generated type cannot know that,
 * so the create payloads below are typed as partial on purpose.
 */
type NewEntry = Omit<Partial<Entry>, "id"> & { title: string };

/** The cast that makes the deliberate omission above type-check. */
const asNewEntry = (d: NewEntry) => d as unknown as Entry;

/**
 * End-to-end verification of the editing surface.
 *
 * Not a unit test of the schema — an exercise of the things a person actually
 * does in the CMS, through the same Local API the admin panel uses:
 *
 *   1. add a collection to the library by hand (no pipeline, no import)
 *   2. find it by searching for words in its title and description
 *   3. filter it by its facets
 *   4. edit it, including giving it a thumbnail
 *   5. add a block to a page and confirm the page carries it
 *   6. delete the collection again
 *
 * Every step asserts. A silent pass is the point: the last time this was
 * checked by eye, a filter that had no schema field was being dropped by
 * Payload without an error and two "different" rows rendered byte-identically.
 *
 * Run: npx payload run scripts/verify-cms.ts
 */

const payload = await getPayload({ config });

let failures = 0;
function ok(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const brands = await payload.find({ collection: "brands", limit: 20, depth: 0 });
const HOUSE = brands.docs.find((b) => b.slug === "lolli-brands")!.id;

const people = await payload.find({
  collection: "people",
  where: { slug: { equals: "tereza" } },
  limit: 1,
  depth: 0,
});
const TEREZA = people.docs[0]?.id;

// ── 1. Add a collection by hand ─────────────────────────────────────────
// Deliberately omits `slug` and `sourcePlatform`, which are both required:
// they are filled by the beforeValidate hook, and if that ever regresses this
// create throws instead of silently making a person type a URL slug.

const MARKER = "ZZ Verification Fixture";
const created = await payload.create({
  collection: "entries",
  data: asNewEntry({
    title: MARKER,
    description: "A temporary row created by scripts/verify-cms.ts. Safe to delete.",
    url: "https://drive.google.com/drive/folders/verify-fixture",
    kind: "headshots",
    occasion: "cover-shoot",
    year: 2026,
    tenant: HOUSE,
    access: "public",
    fileCount: 12,
    people: TEREZA ? [TEREZA] : undefined,
    tags: [{ tag: "verification" }],
    _status: "published",
  }),
  draft: false,
  overrideAccess: true,
});

ok("a collection can be added by hand", Boolean(created.id));
ok("slug is generated from the title", created.slug === "zz-verification-fixture", String(created.slug));
ok("platform is read off the URL", created.sourcePlatform === "drive", String(created.sourcePlatform));

// ── 2. Find it by searching ─────────────────────────────────────────────

const byTitle = await payload.find({
  collection: "entries",
  where: { title: { like: "Verification Fixture" } },
  limit: 5,
  depth: 0,
  overrideAccess: true,
});
ok("it is findable by title", byTitle.docs.some((d) => d.id === created.id));

const byDescription = await payload.find({
  collection: "entries",
  where: { description: { like: "temporary row" } },
  limit: 5,
  depth: 0,
  overrideAccess: true,
});
ok("it is findable by description", byDescription.docs.some((d) => d.id === created.id));

// ── 3. Filter it by its facets ──────────────────────────────────────────

for (const [label, where] of [
  ["kind", { kind: { equals: "headshots" } }],
  ["occasion", { occasion: { equals: "cover-shoot" } }],
  ["year", { year: { equals: 2026 } }],
  ...(TEREZA ? ([["person", { people: { in: [TEREZA] } }]] as const) : []),
] as [string, Where][]) {
  const r = await payload.find({
    collection: "entries",
    where: { and: [where, { id: { equals: created.id } }] } as Where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  ok(`it is filterable by ${label}`, r.totalDocs === 1);
}

// ── 4. Edit it, including a thumbnail ───────────────────────────────────

const THUMB = "https://drive.google.com/thumbnail?id=verify-fixture&sz=w1200";
const edited = await payload.update({
  collection: "entries",
  id: created.id,
  data: {
    title: `${MARKER} (edited)`,
    previewUrl: THUMB,
    altText: "Verification fixture thumbnail",
  },
  draft: false,
  overrideAccess: true,
});
ok("an existing collection can be edited", edited.title === `${MARKER} (edited)`);
ok("a thumbnail can be set", edited.previewUrl === THUMB, String(edited.previewUrl));
ok(
  "the slug is NOT rewritten by a retitle",
  edited.slug === "zz-verification-fixture",
  String(edited.slug),
);

// TereZa's capital Z is enforced on write, so a hand edit cannot undo it.
const cased = await payload.update({
  collection: "entries",
  id: created.id,
  data: { description: "A shoot with Tereza Lolli." },
  draft: false,
  overrideAccess: true,
});
ok(
  "TereZa keeps her capital Z through a hand edit",
  String(cased.description).includes("TereZa"),
  String(cased.description),
);

// ── 5. Add a block to a page ────────────────────────────────────────────

const pages = await payload.find({
  collection: "pages",
  where: { slug: { equals: "/" } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
});
const home = pages.docs[0]!;
const before = (home.layout ?? []).length;

const withBlock = await payload.update({
  collection: "pages",
  id: home.id,
  data: {
    layout: [
      ...(home.layout ?? []),
      {
        blockType: "quote",
        quote: "Verification fixture quote.",
        attribution: "scripts/verify-cms.ts",
      },
    ],
  },
  draft: false,
  overrideAccess: true,
});
ok("a block can be added to a page", (withBlock.layout ?? []).length === before + 1);
ok(
  "the added block keeps its type and content",
  (withBlock.layout ?? []).at(-1)?.blockType === "quote",
);

// Put the page back exactly as it was.
const restored = await payload.update({
  collection: "pages",
  id: home.id,
  data: { layout: home.layout },
  draft: false,
  overrideAccess: true,
});
ok("a block can be removed again", (restored.layout ?? []).length === before);

// ── 6. Delete the fixture ───────────────────────────────────────────────

await payload.delete({ collection: "entries", id: created.id, overrideAccess: true });
const gone = await payload.find({
  collection: "entries",
  where: { id: { equals: created.id } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
});
ok("a collection can be deleted", gone.totalDocs === 0);

// ── The child-safety gate still refuses ─────────────────────────────────
// Verified LAST, because everything above writes to the same collection and a
// regression here is the one that cannot be undone by an edit.

let refused = false;
try {
  await payload.create({
    collection: "entries",
    data: asNewEntry({
      title: "ZZ Verification Minor Gate",
      description: "Should never publish.",
      url: "https://drive.google.com/drive/folders/verify-minor",
      kind: "b-roll",
      tenant: HOUSE,
      access: "public",
      containsMinor: true,
      containsMinorConfirmed: false,
      _status: "published",
    }),
    draft: false,
    overrideAccess: true,
  });
} catch {
  refused = true;
}
ok("an unconfirmed contains-minor entry still cannot be published", refused);

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} FAILED`}`);
if (failures) process.exit(1);
