import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Move the last hardcoded content into the CMS.
 *
 * Three of the most visible things on the site were constants in the code:
 * the film slate, the family bios, and the navigation and footer. The CMS had
 * matching collections and nothing read them, so "everything is editable" was
 * not true of exactly the things a client asks to change first.
 *
 * This seeds those records from the values that were in the code, so nothing
 * on the site changes appearance — but from here on every one of them is
 * edited in /admin instead of in a file.
 *
 * Idempotent. Run: npx payload run scripts/seed-content.ts
 */

const payload = await getPayload({ config });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const brands = await payload.find({ collection: "brands", limit: 20, depth: 0 });
const bySlug = Object.fromEntries(brands.docs.map((b) => [b.slug as string, b.id]));

async function upsert(collection: string, where: Record<string, unknown>, data: Record<string, unknown>) {
  const found = await api.find({ collection, where, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs.length) {
    await api.update({ collection, id: found.docs[0].id, data, depth: 0, overrideAccess: true });
    return "updated";
  }
  await api.create({ collection, data, depth: 0, overrideAccess: true });
  return "created";
}

// ── The slate ───────────────────────────────────────────────────────────
// Award counts and notes as they stood in lib/fampire/catalog.ts.

const FILMS = [
  { slug: "biohack-yourself", title: "Biohack Yourself", awards: 16, note: "Five-part flagship", year: 2024, status: "released" },
  { slug: "the-guru", title: "The Guru", awards: 19, note: "Most decorated on the slate", year: 2024, status: "released" },
  { slug: "skin-deep", title: "Skin Deep", awards: 13, note: "Feature documentary", year: 2023, status: "released" },
  { slug: "the-super-lollis", title: "The Super Lollis", awards: 13, note: "Six episodes", year: 2022, status: "released" },
  { slug: "from-fat-lolli", title: "From Fat Lolli to 6 Pack Lolli", awards: 4, note: "The origin story", year: 2020, status: "released" },
  { slug: "shealed", title: "sHEALed", awards: 3, note: "Four parts · releasing 2026", year: 2026, status: "in-production" },
  { slug: "bye-ol-dentistry", title: "Bye Ol' Dentistry", awards: 0, note: "In production", year: 2026, status: "in-production" },
  { slug: "the-new-woo", title: "The New Woo", awards: 0, note: "In pre-production", year: 2026, status: "pre-production" },
];

for (const f of FILMS) {
  const r = await upsert("films", { slug: { equals: f.slug } }, f);
  console.log(`  film     ${r}  ${f.title}`);
}

// ── The family ──────────────────────────────────────────────────────────
// Bios as they stood on the People page. TereZa always with a capital Z (§10).

const FAMILY = [
  {
    slug: "anthony",
    name: "Anthony Lolli",
    role: "Founder · Director · Author",
    bio: "Anthony Lolli is a real estate mogul and the best-selling author of The Heart of the Deal, who built a multimillion-dollar empire from scratch. At 315 pounds and facing major health decline, he made the radical decision to document his 125-pound transformation on camera — launching the documentary From Fat Lolli to 6 Pack Lolli, which became a global phenomenon on Prime Video and Apple TV.",
    isFamily: true,
    isMinor: false,
  },
  {
    slug: "tereza",
    name: "TereZa Hakobyan-Lolli",
    role: "Editor-in-Chief · Director · Recording Artist",
    bio: "TereZa Hakobyan-Lolli is an Armenian-born actress, recording artist, mother and editor-in-chief who turned postpartum hormonal collapse into a wellness revolution — winning two bikini world titles and documenting it all through films including The Super Lollis, Skin Deep and sHEALed.",
    isFamily: true,
    isMinor: false,
  },
  {
    slug: "love",
    name: "Love Lolli",
    role: "Correspondent · Director · Producer",
    bio: "Love Lolli reports on health news, conducts on-camera interviews at events, and invests in real estate — all before the age of ten. Credited as a director and producer.",
    isFamily: true,
    isMinor: true,
  },
  {
    slug: "legend",
    name: "Legend Lolli",
    role: "Correspondent · Director · Producer",
    bio: "Legend Lolli reports on health news and builds media projects alongside his sister. Credited as a director and producer.",
    isFamily: true,
    isMinor: true,
  },
];

for (const p of FAMILY) {
  const r = await upsert("people", { slug: { equals: p.slug } }, p);
  console.log(`  person   ${r}  ${p.name}`);
}

// ── Navigation and footer ───────────────────────────────────────────────
// The masthead and footer links, previously a NAV constant in Shell.tsx.

const r = await upsert(
  "site-settings",
  { label: { equals: "FAMPIRE" } },
  {
    label: "FAMPIRE",
    tenant: bySlug["lolli-brands"],
    nav: [
      { label: "The Library", href: "/library" },
      { label: "Films", href: "/films" },
      { label: "People", href: "/people" },
      { label: "Press", href: "/press" },
    ],
    footer: {
      blurb:
        "The press room for The Lolli Family Institution. Every collection links straight to where it lives — nothing here is re-hosted.",
      links: [
        { label: "Book them", href: "/book" },
        { label: "Clip them", href: "/clip-them" },
        { label: "The Institution", href: "/institution" },
        { label: "The Magazine", href: "/magazine" },
        { label: "The Room", href: "/the-room" },
      ],
      trademarkNote: "FAMPIRE®, WYNX®, HNN®, BIOHACK YOURSELF®, World's Top Dentist™",
    },
    searchPlaceholder: "Search — a person, a film, an event, a year",
  },
);
console.log(`  settings ${r}  navigation & footer`);

console.log("\nThe slate, the bios and the navigation are now CMS records.");
process.exit(0);
