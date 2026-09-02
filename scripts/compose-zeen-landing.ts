import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Recompose the landing page in the approved Zeen order, and make sure the
 * data the new blocks read actually exists.
 *
 * Two things happen here and nothing else:
 *
 *  1. HNN is added to Brands if missing. The brief names it as a brand to show
 *     in the strip, and it was the one named brand with no record — the strip
 *     reads the collection, so a brand that is not in the CMS cannot appear.
 *
 *  2. The `/` page gets the deck hero and the brand strip at the top, a press
 *     row it never had, and the existing blocks in the approved section order.
 *     EXISTING BLOCKS ARE REUSED BY ID, never rebuilt: their copy is the
 *     client's own and was written in the CMS, so re-seeding it from a script
 *     would silently overwrite editorial work with whatever a developer typed.
 *
 *   DRY_RUN=1 npx payload run scripts/compose-zeen-landing.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const admin = (
  await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];

// ── 1. HNN as a brand ───────────────────────────────────────────────────
const brands = await api.find({ collection: "brands", limit: 200, depth: 0, overrideAccess: true });
const hasHnn = (brands.docs as { slug: string }[]).some((b) => /^hnn$/i.test(b.slug));
if (!hasHnn) {
  console.log("brands: adding HNN");
  if (!DRY) {
    await api.create({
      collection: "brands",
      data: {
        name: "Health News Network",
        slug: "hnn",
        tagline: "The network the work lives on — free, no paywall.",
        hasAssets: false,
      },
      overrideAccess: true,
      user: admin,
    });
  }
} else {
  console.log("brands: HNN already present");
}
const brandCount = (hasHnn ? brands.docs.length : brands.docs.length + 1);
console.log(`brands total: ${brandCount}`);

// ── 2. The landing page ─────────────────────────────────────────────────
const page = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true, draft: true })
).docs[0];
if (!page) throw new Error("no page with slug '/'");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const existing = (page.layout ?? []) as any[];
const byType = new Map<string, Record<string, unknown>>();
for (const b of existing) if (!byType.has(b.blockType)) byType.set(b.blockType, b);
console.log(`current blocks: ${existing.map((b) => b.blockType).join(", ")}`);

/** Reuse the block the editor already has, so its copy survives untouched. */
const keep = (t: string) => byType.get(t);

const deckHero = {
  blockType: "deckHero",
  wordmark: "FAMPIRE",
  // The institution's own line, from their script. Not invented copy.
  headline: "Wealth is passed.",
  headlineTail: "Health is not.",
  rail: "THE LOLLI FAMILY INSTITUTION",
  note:
    "A family that spent ten years filming the people capital is now chasing. Films, people, events and the full media library — linked straight to where each collection lives.",
  // Empty `people` on purpose: the block then follows the family automatically,
  // so a family member added in the CMS appears in the hero with no page edit.
  people: [],
};

const brandStrip = {
  blockType: "brandStrip",
  label: "The worlds we have built",
  brands: [], // empty = every brand in the CMS, which is the point of the brief
  marquee: true,
};

const pressList = {
  blockType: "pressList",
  heading: "The press",
  intro: "Podcasts, panels, keynotes and broadcast — every appearance, with where to watch it.",
  ...(keep("pressList") ?? {}),
};

/**
 * The approved section order, with FAMPIRE's own content in each slot.
 *
 * The template's testimonial, pricing and application sections are absent by
 * design: FAMPIRE's hard rule is no gates on public surfaces — no login, no
 * form, no email capture — and its own script says "there is nothing to buy".
 * Those three slots carry press, showcase and the magazine instead, which is
 * what the brief asked to be prominent.
 */
const order = [
  deckHero,
  brandStrip,
  keep("statement"),
  keep("searchBar"),
  keep("lanes"),
  keep("filmStrip"),
  keep("peopleRow"),
  pressList,
  keep("entryQuery"),
  keep("magazineShelf"),
  keep("watchGrid"),
].filter(Boolean);

console.log(`\nnew order (${order.length} blocks):`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
order.forEach((b: any, i) => console.log(`  ${String(i + 1).padStart(2)}. ${b.blockType}`));

const dropped = existing.filter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (b: any) => !order.some((o: any) => o.blockType === b.blockType),
);
if (dropped.length) console.log(`dropped: ${dropped.map((b) => b.blockType).join(", ")}`);

if (!DRY) {
  await api.update({
    collection: "pages",
    id: page.id,
    data: { layout: order },
    depth: 0,
    overrideAccess: true,
    user: admin,
  });
  console.log("\npage '/' updated");
} else {
  console.log("\n[DRY RUN] nothing written");
}
process.exit(0);
