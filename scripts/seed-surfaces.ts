import config from "@payload-config";
import { getPayload } from "payload";

import type { Page } from "@/payload-types";

/**
 * The five surfaces, as CMS pages.
 *
 * The landing page, the Library, Films, People and Press were hardcoded React
 * files — 1,238 lines of JSX carrying the family bios, the institution
 * paragraph, the film synopses, the section numbering and the magazine's
 * retail figure. Which meant the pages the client most wants to change were
 * exactly the pages they could not, and "select a page and edit its blocks"
 * described six orphaned narrative pages nobody had ever linked to.
 *
 * This rebuilds all five as block records. The design is unchanged — the same
 * components render it — but every heading, every paragraph, every stat and
 * the order of the sections are now content.
 *
 * Idempotent on slug: re-running updates the five pages in place and touches
 * nothing else. Run: npx payload run scripts/seed-surfaces.ts
 */

const payload = await getPayload({ config });

const brands = await payload.find({ collection: "brands", limit: 20, depth: 0 });
const HOUSE = brands.docs.find((b) => b.slug === "lolli-brands")?.id;
if (!HOUSE) throw new Error("Brands are not seeded. Run scripts/seed-brands.ts first.");

// ── The landing page ────────────────────────────────────────────────────

type Layout = NonNullable<Page["layout"]>;

const LANDING: Layout = [
  {
    blockType: "heroFeature",
    eyebrow: "The Lolli Family Institution",
    intro:
      "The press room for Lolli Brands Entertainment and Biohack Yourself Media — films, people, events and the full media library, linked straight to where each collection lives.",
    // Left empty so the hero uses the configured house film; an editor can
    // point it at any Vimeo ID without touching code.
    videoId: "",
    // The trailer opens on a burned-in title card. Starting past it means the
    // hero is photography from its first frame rather than type on type.
    startAt: 48,
    stats: [
      { label: "collections indexed", source: "entryCount" },
      { label: "documentary films", source: "filmCount" },
      { label: "events covered", source: "eventCount" },
    ],
    actions: [
      { label: "Open the library", href: "/library", emphasis: "primary" },
      { label: "Press log", href: "/press", emphasis: "secondary" },
    ],
  },
  {
    blockType: "searchBar",
    placeholder: "Search — a person, a film, an event, a year",
  },
  {
    blockType: "lanes",
    heading: "What are you here to do",
    lanes: [
      {
        label: "Book them",
        detail: "Bios, headshots and the introduction an MC reads out loud.",
        href: "/library?kind=headshots",
      },
      {
        label: "Write about them",
        detail: "Synopses, award counts, press coverage and approved copy.",
        href: "/library?kind=press",
      },
      {
        label: "Clip them",
        detail: "B-roll, trailers and cut recaps, straight into the timeline.",
        href: "/library?kind=b-roll",
      },
      {
        label: "Stage them",
        detail: "Event photography, galleries and logo packs for the room.",
        href: "/library?kind=event+photography",
      },
    ],
  },
  {
    blockType: "statement",
    eyebrow: "The institution",
    heading: "FAMPIRE is the crown above the worlds — not a company.",
    body:
      "Anthony and TereZa Lolli are the couple behind Biohack Yourself Media — an independent health and wellness platform reaching millions with expert-driven journalism and award-winning storytelling. Together they have produced more than a dozen documentaries, and they are raising two young trailblazers, Love and Legend Lolli, who are already reporting on health news before the age of ten.",
    secondary:
      "In 2024 their influence reached national scale when Biohack Yourself Media was selected as the exclusive health press at the MAHA Inaugural Ball — the Waldorf Astoria, Washington D.C., 20 January 2025.",
    actionLabel: "See the MAHA coverage",
    actionHref: "/library?event=MAHA+Inaugural+Ball",
  },
  {
    blockType: "filmStrip",
    heading: "The films",
    layout: "grid",
    showWatchLinks: false,
  },
  {
    blockType: "peopleRow",
    heading: "The people",
    layout: "portraits",
    showBios: true,
  },
  {
    blockType: "entryQuery",
    heading: "The room",
    layout: "grid",
    limit: 6,
    sort: "-fileCount",
    filters: { kind: ["event photography"] },
    viewAll: "/library?kind=event+photography",
  },
  {
    blockType: "magazineShelf",
    heading: "The magazine",
    aside: "Eight issues · print in 4,300+ US and Canadian retail locations",
    limit: 12,
  },
  {
    blockType: "watchGrid",
    heading: "Where to watch",
    note:
      "Every collection listed here is open to everyone, no account required. The remainder are password-gated at source or held back pending written sign-off, and need a FAMPIRE sign-in.",
  },
];

// ── The five pages ──────────────────────────────────────────────────────

type Surface = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  layout: Layout;
};

const PAGES: Surface[] = [
  {
    slug: "/",
    title: "FAMPIRE Media Center",
    // The root layout appends "— FAMPIRE Media Center" to every title, so
    // repeating the name here produced "FAMPIRE Media Center — The Lolli
    // Family Institution — FAMPIRE Media Center" in the tab and in every unfurl.
    seoTitle: "The Lolli Family Institution",
    seoDescription:
      "The press room for Lolli Brands Entertainment and Biohack Yourself Media. Films, people, events and the full media library, linked straight to source.",
    layout: LANDING,
  },
  {
    slug: "/library",
    title: "The Library",
    seoTitle: "The Library",
    seoDescription:
      "Every collection in the FAMPIRE Media Center, filterable by person, kind, year, film and event.",
    layout: [
      {
        blockType: "libraryBrowser",
        heading: "The Library",
        perPage: 60,
        showFacets: true,
        showSearch: true,
        showSort: true,
        showCount: true,
      },
    ],
  },
  {
    slug: "/films",
    title: "The Films",
    seoTitle: "Films",
    seoDescription:
      "The documentary slate from Lolli Brands Entertainment — synopses, award counts, assets and where to watch.",
    layout: [
      {
        blockType: "hero",
        heading: "The Films",
        intro:
          "Each title links straight into the library filtered to its own assets. Synopses, award counts and where-to-watch links are maintained in the CMS.",
      },
      { blockType: "filmStrip", heading: "The slate", layout: "profiles", showWatchLinks: true },
    ],
  },
  {
    slug: "/people",
    title: "The People",
    seoTitle: "People",
    seoDescription:
      "Anthony Lolli, TereZa Hakobyan-Lolli, Love Lolli and Legend Lolli — bios, headshots and the approved on-air introduction.",
    layout: [
      { blockType: "hero", heading: "The People" },
      { blockType: "peopleRow", heading: "The family", layout: "profiles" },
      {
        blockType: "copyBlock",
        heading: "The introduction — read this aloud",
        intro: "Approved by the family. Roughly thirty seconds at broadcast pace.",
        variants: [
          {
            label: ":30 introduction",
            /** The client's approved podcast intro, verbatim. §8: "an MC finds,
             *  copies and prints a :30 introduction in under 30 seconds". */
            text: [
              "Today's guests are a couple who didn't just survive the system — they rebuilt it.",
              "Anthony and TereZa Lolli are the power couple behind Biohack Yourself Media — one of the fastest-growing independent health and wellness news platforms in the world — reaching millions with expert-driven journalism, science-backed content, and award-winning storytelling.",
              "Together, they've co-founded Lolli Brands Entertainment, producing more than a dozen acclaimed health and transformation documentaries. And they're raising two young trailblazers, Love and Legend Lolli, who are already reporting on health news, building media projects, and investing in real estate — all before age 10.",
              "They're not just content creators — they're immersive documentarians, performance marketers, and media entrepreneurs turning pain into purpose, and purpose into platforms.",
              "Please welcome Anthony and TereZa Lolli.",
            ].join("\n\n"),
          },
          {
            label: "Spelling note",
            text:
              "TereZa is always spelled with a capital Z — in copy, in captions, in lower thirds and in file names.",
          },
        ],
      },
    ],
  },
  {
    slug: "/press",
    title: "Press",
    seoTitle: "Press",
    seoDescription:
      "Every recorded podcast, broadcast and press appearance by Anthony and TereZa Lolli — dated, credited and linked.",
    layout: [
      {
        blockType: "hero",
        heading: "Press",
        intro:
          "Every recorded appearance. Where the client logged an audience figure it is reproduced here as written, never estimated.",
      },
      { blockType: "pressList", heading: "Appearances", featuredCount: 3 },
      {
        blockType: "cta",
        heading: "Looking for something to clip rather than something to read?",
        actions: [{ label: "The b-roll collections", href: "/library?kind=b-roll" }],
        note: "Filtered, and one click from the source folder.",
      },
    ],
  },
];

for (const page of PAGES) {
  const existing = await payload.find({
    collection: "pages",
    where: { slug: { equals: page.slug } },
    limit: 1,
    depth: 0,
  });

  const data = { ...page, tenant: HOUSE, _status: "published" as const };

  if (existing.docs[0]) {
    await payload.update({
      collection: "pages",
      id: existing.docs[0].id,
      data,
      // The five surfaces are published by definition; a draft here means the
      // site has no landing page.
      draft: false,
      overrideAccess: true,
    });
    console.log(`updated  ${page.slug.padEnd(10)} ${page.layout.length} blocks`);
  } else {
    await payload.create({ collection: "pages", data, draft: false, overrideAccess: true });
    console.log(`created  ${page.slug.padEnd(10)} ${page.layout.length} blocks`);
  }
}

/**
 * The orphaned narrative pages.
 *
 * `/institution`, `/book`, `/magazine`, `/the-room`, `/clip-them` and
 * `/films/biohack-yourself` are reachable only by typing the URL: the
 * navigation carries four links and the landing page's lanes point into
 * `/library?kind=…`. They are unpublished rather than deleted — every version
 * is kept, so restoring one is a click in the admin, and nothing is destroyed
 * on the client's behalf.
 */
const KEEP = new Set(PAGES.map((p) => p.slug));
const all = await payload.find({ collection: "pages", limit: 200, depth: 0, overrideAccess: true });
for (const doc of all.docs) {
  if (KEEP.has(doc.slug as string) || doc._status !== "published") continue;
  await payload.update({
    collection: "pages",
    id: doc.id,
    data: { _status: "draft" },
    overrideAccess: true,
  });
  console.log(`unpublished ${doc.slug} (kept as a draft, recoverable in the admin)`);
}

console.log("\nfive surfaces seeded.");
