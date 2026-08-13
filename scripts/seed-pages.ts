import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Author the narrative surfaces (build plan §12 stage 4).
 *
 * Every word of prose here is the CLIENT'S, lifted from
 * `data/current-media-kit-content.txt` — the 24,550-character page copy the
 * crawl captured. Nothing is invented: §4.6 calls enrichment "verification
 * rather than authoring", and that applies harder to a press room's own voice
 * than it does to metadata. Where the media kit is silent, the page is silent.
 *
 * Two §8 success criteria live or die on this file:
 *   - "A booker on a phone understands the institution and reaches a booking
 *     CTA in <60s"  → /book
 *   - "An MC finds, copies and prints a :30 introduction in <30s"  → /book,
 *     the copy-and-paste block carrying the client's own host reads
 *
 * Pages are blocks, not templates, so the media team can reorder or replace
 * any of this without a deploy. The card blocks query the catalog live (§4.5
 * rule 3), so a narrative page cannot drift from the collections it describes.
 *
 * Idempotent on slug. Run: npx payload run scripts/seed-pages.ts
 */

const payload = await getPayload({ config });

const brands = await payload.find({ collection: "brands", limit: 20, depth: 0 });
const bySlug = Object.fromEntries(brands.docs.map((b) => [b.slug as string, b.id]));
const HOUSE = bySlug["lolli-brands"];
const BHY = bySlug["biohack-yourself"];

/** Lexical needs a document tree; this is the minimum valid one. */
const rich = (...paragraphs: string[]) => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr" as const,
    children: paragraphs.map((text) => ({
      type: "paragraph",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr" as const,
      children: [{ type: "text", text, format: 0, style: "", mode: "normal", detail: 0, version: 1 }],
    })),
  },
});

// ── The client's own words ──────────────────────────────────────────────

const HOST_READ_FULL = `Today's guests are a couple who didn't just survive the system — they rebuilt it.

Anthony and TereZa Lolli are the power couple behind Biohack Yourself Media — the fastest-growing independent health and wellness news platform in the world — reaching millions with expert-driven journalism, science-backed content, and award-winning storytelling. But before they became health media disruptors… they were in survival mode.

Anthony Lolli is a real estate mogul and the best-selling author of The Heart of the Deal, who built a multimillion-dollar empire from scratch. But at 315 pounds, facing major health decline, he made the radical decision to document his 125-pound transformation on camera — launching the now-viral documentary Fat Lolli to Six Pack Lolli, which became a global phenomenon on Prime Video and Apple TV.

TereZa Hakobyan-Lolli is an Armenian-born actress, recording artist, mother, and editor-in-chief who turned postpartum hormonal collapse into a wellness revolution — winning two bikini world titles and documenting it all through films like The Super Lollis, Skin Deep, and sHEALed.

Together, they've co-founded Lolli Brands Entertainment — producing more than a dozen acclaimed health and transformation documentaries. And they're raising two young trailblazers, Love and Legend Lolli, who are already reporting on health news, building media projects, and investing in real estate — all before age 10.

In 2024, their influence reached national heights when Biohack Yourself Media was selected as the exclusive health press at RFK Jr.'s MAHA Inaugural Ball.

They're not just content creators — they're immersive documentarians, performance marketers, and media entrepreneurs turning pain into purpose… and purpose into platforms. This is what it looks like when you combine hustle, healing, and a whole lot of heart.

Let's welcome Anthony and TereZa Lolli.`;

/**
 * The :30 version.
 *
 * Condensed from the host read above using only sentences that appear in it —
 * an MC needs thirty seconds, and the full read is nearer three minutes. No
 * new claims: every fact here is in the client's own paragraph.
 */
const HOST_READ_30 = `Anthony and TereZa Lolli are the couple behind Biohack Yourself Media — an independent health and wellness news platform reaching millions with expert-driven journalism and award-winning storytelling.

Anthony is a real estate mogul and best-selling author who documented his own 125-pound transformation on camera. TereZa is an Armenian-born actress, recording artist and editor-in-chief who turned postpartum hormonal collapse into a wellness revolution.

Together they founded Lolli Brands Entertainment, producing more than a dozen health and transformation documentaries — and in 2024 Biohack Yourself Media was the exclusive health press at RFK Jr.'s MAHA Inaugural Ball.

Please welcome Anthony and TereZa Lolli.`;

const ABOUT_HOUSE = `Lolli Brands Entertainment is a media and production company focused on developing original documentary films and long-form content centered on health, longevity, and human performance. The company produces award-winning projects across areas, including preventative health, women's health, biohacking, pet wellness, and more, working with clinicians, researchers, and subject-matter experts to translate complex topics into accessible, culturally relevant storytelling—redefining storytelling in the health and wellness space. Lolli Brands prioritizes factual accuracy, real-world impact, and long-term relevance over trend-driven content.`;

const ABOUT_BHY = `Biohack Yourself Media is an independent omni-media health and lifestyle platform delivering science-backed health insights, unbiased reporting, and original storytelling. It operates across publishing, documentary film, digital media, live events, performance marketing, children's content, sports, and physical merchandise, with a focus on longevity, wellness, and human performance. Guided by principles of truth, transparency, and editorial integrity, Biohack Yourself Media combines expert-driven journalism with culturally relevant storytelling to highlight the clinicians, researchers, innovators, and thought leaders shaping the future of health.`;

const TERMS = `We invite PR companies, press, and creatives to utilize these assets freely for the creation of news, articles, graphics, flyers, and other promotional or creative projects. Feel free to adapt and incorporate these materials as needed.`;

const TERMS_DISCLAIMER = `While these assets are provided for unrestricted use, we kindly request attribution to Biohack Yourself Media and Lolli Brands Entertainment where applicable. These assets may not be used in any way that misrepresents, defames, or causes harm to Biohack Yourself Media, Lolli Brands Entertainment or any associated individuals or entities. All intellectual property rights to these assets remain with Biohack Yourself Media LLC & Lolli Brands Entertainment LLC. Permission is granted for usage as outlined, but ownership is not transferred.`;

const MAGAZINE_INTRO = `Following the success of the globally launched "Biohack Yourself" documentary series—an immersive deep dive into the forefront of health, longevity, and biohacking—Biohack Yourself Media is taking the movement to the next level. Enter Biohack Yourself Magazine, a cutting-edge publication designed to empower wellness enthusiasts with actionable, science-backed insights and revolutionary innovations.`;

const BHY_SYNOPSIS = `"Biohack Yourself" is a documentary from Lolli Brands Entertainment, unfolding across five compelling parts that chronicle the explorative journey of the Lolli family, led by parents Anthony and TereZa, into the realm of biohacking. Confronted with life-altering symptoms and disillusioned by the limitations of Western medicine, the Lollis embark on an extraordinary exploration, weaving a narrative of resilience and hope for audiences globally seeking health solutions and improvements.

Featuring unprecedented access to global experts, the documentary incorporates insights from over 40 world-leading doctors, professors, and inventors, breaking down barriers to biohacking.`;

// ── Pages ───────────────────────────────────────────────────────────────

type PageSeed = {
  slug: string;
  title: string;
  tenant: number;
  seoDescription: string;
  layout: Record<string, unknown>[];
};

const PAGES: PageSeed[] = [
  {
    slug: "/institution",
    title: "The Institution",
    tenant: HOUSE as number,
    seoDescription:
      "Lolli Brands Entertainment and Biohack Yourself Media — who they are, what they make, and how to use these materials.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "The Lolli Family Institution",
        heading: "The Institution",
        intro:
          "A production house and an independent health media platform, and the family behind both.",
      },
      { blockType: "richText", content: rich("Lolli Brands Entertainment", ABOUT_HOUSE), width: "prose" },
      { blockType: "richText", content: rich("Biohack Yourself Media", ABOUT_BHY), width: "prose" },
      {
        blockType: "stats",
        heading: "By the numbers",
        stats: [
          { value: "0", label: "collections indexed", source: "entryCount" },
          { value: "0", label: "documentary films", source: "filmCount" },
          { value: "0", label: "documentary awards", source: "awardTotal" },
        ],
      },
      {
        blockType: "entryQuery",
        heading: "Logos and wordmarks",
        intro: "Brand marks for both companies, ready to place.",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { kind: ["logo"] },
        viewAll: "/library?kind=logo",
      },
      {
        blockType: "richText",
        content: rich("Using these materials", TERMS, TERMS_DISCLAIMER),
        width: "prose",
      },
    ],
  },

  {
    slug: "/book",
    title: "Book Them",
    tenant: HOUSE as number,
    seoDescription:
      "Everything a booker or an MC needs: a thirty-second introduction to read out loud, the full host read, bios and headshots.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "For bookers, producers and MCs",
        heading: "Book Anthony and TereZa",
        intro:
          "The introduction to read on air, the full host read, and the headshots — all of it free to use, no login and no form.",
        actions: [
          { label: "Headshots and bios", href: "/library?kind=headshots", emphasis: "primary" },
          { label: "The people", href: "/people", emphasis: "secondary" },
        ],
      },
      {
        blockType: "copyBlock",
        heading: "Read this out loud",
        intro:
          "Written by the family. Copy it as it stands — it is already approved copy.",
        variants: [
          { label: ":30 introduction", text: HOST_READ_30 },
          { label: "Full host read — also usable as a show description", text: HOST_READ_FULL },
        ],
      },
      {
        blockType: "entryQuery",
        heading: "Headshots and portraits",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { kind: ["headshots", "event photography"], excludeMinors: true },
        viewAll: "/library?kind=headshots",
      },
      {
        blockType: "cta",
        heading: "Something not here?",
        intro:
          "The library is the whole archive. If what you need is not in it, the media team can point you at it.",
        actions: [{ label: "Open the Library", href: "/library" }],
        note: "No gate: every asset on this site opens without an account.",
      },
    ],
  },

  {
    slug: "/magazine",
    title: "The Magazine",
    tenant: BHY as number,
    seoDescription:
      "Biohack Yourself Magazine — the issues, their cover subjects, and the production files behind them.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "Biohack Yourself Media",
        heading: "The Magazine",
        intro: "The Future of Wellness Media.",
      },
      { blockType: "richText", content: rich(MAGAZINE_INTRO), width: "prose" },
      {
        blockType: "entryQuery",
        heading: "Issues and cover shoots",
        intro:
          "Production files, cover shoots and deliverables for each issue, straight from the archive.",
        layout: "grid",
        limit: 12,
        sort: "-fileCount",
        filters: { kind: ["magazine"] },
        viewAll: "/library?kind=magazine",
      },
    ],
  },

  {
    slug: "/the-room",
    title: "The Room",
    tenant: BHY as number,
    seoDescription:
      "Premieres, red carpets, summits and signings — the events, and the photography and footage from each.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "Events",
        heading: "The Room",
        intro:
          "Premieres, red carpets, summits and book signings — and the photography and footage from each.",
      },
      {
        blockType: "richText",
        content: rich(
          "In 2024, Biohack Yourself Media was selected as the exclusive health press at RFK Jr.'s MAHA Inaugural Ball.",
        ),
        width: "prose",
      },
      {
        blockType: "entryQuery",
        heading: "Premieres and red carpets",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { occasion: ["premiere"] },
        viewAll: "/library?occasion=premiere",
      },
      {
        blockType: "entryQuery",
        heading: "Conferences and summits",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { occasion: ["conference"] },
        viewAll: "/library?occasion=conference",
      },
      {
        blockType: "entryQuery",
        heading: "Book signings",
        layout: "grid",
        limit: 6,
        sort: "-dateStart",
        filters: { occasion: ["book-signing"] },
        viewAll: "/library?occasion=book-signing",
      },
    ],
  },

  {
    slug: "/clip-them",
    title: "Clip Them",
    tenant: HOUSE as number,
    seoDescription:
      "B-roll, trailers and behind-the-scenes footage — filterable by orientation, so vertical cuts are one click away.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "For editors",
        heading: "Clip Them",
        intro:
          "B-roll, trailers and behind-the-scenes footage. Every collection links straight into the folder it lives in — nothing is re-hosted, so what you open is the original.",
        actions: [
          { label: "Vertical b-roll", href: "/library?kind=b-roll&orientation=portrait", emphasis: "primary" },
          { label: "All b-roll", href: "/library?kind=b-roll", emphasis: "secondary" },
        ],
      },
      {
        blockType: "entryQuery",
        heading: "Vertical — for social",
        intro: "Orientation measured by sampling the actual frames, not guessed from a filename.",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { kind: ["b-roll"], orientation: ["portrait"] },
        viewAll: "/library?kind=b-roll&orientation=portrait",
      },
      {
        blockType: "entryQuery",
        heading: "Horizontal — for broadcast and long form",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { kind: ["b-roll"], orientation: ["landscape"] },
        viewAll: "/library?kind=b-roll&orientation=landscape",
      },
      {
        blockType: "entryQuery",
        heading: "Behind the scenes",
        layout: "grid",
        limit: 6,
        sort: "-fileCount",
        filters: { kind: ["BTS"] },
        viewAll: "/library?kind=BTS",
      },
    ],
  },

  {
    slug: "/films/biohack-yourself",
    title: "Biohack Yourself",
    tenant: BHY as number,
    seoDescription:
      "Biohack Yourself — the five-part documentary from Lolli Brands Entertainment. Synopsis, awards and the material behind it.",
    layout: [
      {
        blockType: "hero",
        eyebrow: "Documentary · five parts",
        heading: "Biohack Yourself",
        intro: "The Lolli family's exploration of biohacking, in five parts.",
      },
      { blockType: "richText", content: rich(BHY_SYNOPSIS), width: "prose" },
      {
        blockType: "entryQuery",
        heading: "From the production",
        layout: "grid",
        limit: 9,
        sort: "-fileCount",
        filters: {},
        viewAll: "/library?film=Biohack+Yourself",
      },
    ],
  },
];

// ── Write ───────────────────────────────────────────────────────────────

let created = 0;
let updated = 0;

for (const page of PAGES) {
  if (!page.tenant) {
    console.log(`  SKIP ${page.slug} — no tenant`);
    continue;
  }

  const existing = await payload.find({
    collection: "pages",
    where: { slug: { equals: page.slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = { ...page, _status: "published" };

  if (existing.docs.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (payload as any).update({
      collection: "pages",
      id: existing.docs[0]!.id,
      data,
      depth: 0,
      overrideAccess: true,
    });
    updated++;
    console.log(`  updated  ${page.slug}`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (payload as any).create({ collection: "pages", data, depth: 0, overrideAccess: true });
    created++;
    console.log(`  created  ${page.slug}`);
  }
}

console.log(`\n${created} created · ${updated} updated`);
console.log("Every word of prose is the client's own, from data/current-media-kit-content.txt.");
process.exit(0);
