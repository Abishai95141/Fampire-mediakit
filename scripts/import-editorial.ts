import { readFileSync } from "node:fs";
import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Move the last two bodies of editorial content out of code and into the CMS.
 *
 * Both were things the client can only change by asking a developer:
 *
 *  - FILM SYNOPSES were a `Record<string, string>` keyed by title inside the
 *    Films route. The `synopsis` field existed on the collection and was empty
 *    on all eight rows, so the CMS looked like it did not drive the page.
 *    Worse, the map was keyed by TITLE — renaming a film in the admin silently
 *    blanked its synopsis with no error anywhere.
 *
 *  - THE PRESS LOG was read straight out of `data/fampire/appearances.json` by
 *    the Press route, so logging one meant re-running a scraper. §8 asks for
 *    "a new appearance is logged in <2 min and appears publicly"; a JSON file
 *    in the repo cannot meet that.
 *
 * Idempotent: films match on slug, appearances on URL. Re-running updates in
 * place and never duplicates.
 *
 * Run: npx payload run scripts/import-editorial.ts
 */

const payload = await getPayload({ config });

/**
 * Appearances are tenant-scoped, so every row needs a world.
 *
 * The multi-tenant plugin injects `tenant` as a REQUIRED field on the
 * collections listed in payload.config.ts. Omitting it fails validation with
 * "Assigned Tenant — This field is required", which reads like a schema bug
 * rather than a missing value. The press log belongs to the house brand.
 */
const brands = await payload.find({ collection: "brands", limit: 20, depth: 0 });
const HOUSE = brands.docs.find((b) => b.slug === "lolli-brands")?.id;
if (!HOUSE) throw new Error("Brands are not seeded. Run scripts/seed-brands.ts first.");

// ── Film synopses ───────────────────────────────────────────────────────
// The client's own words, carried over exactly as the route had them.

const SYNOPSIS: Record<string, string> = {
  "Biohack Yourself":
    "A five-part documentary following Anthony and TereZa Lolli and their family into the world of biohacking after life-changing health challenges. More than 25 evidence-informed modalities and insight from over 40 physicians, scientists and inventors, including Dave Asprey and Ben Greenfield.",
  "The Guru":
    "George Farah, from child soldier to bodybuilding icon. He survives being shot, stage 4 cancer and more, with exclusive interviews from legendary bodybuilders including Kai Greene and Dexter Jackson.",
  "Skin Deep":
    "Alex Porro lost over 300 lbs from a heaviest weight of 480 lbs. He begins his next journey by removing 20 lbs of loose skin, and going through the grueling recovery.",
  "The Super Lollis":
    "TereZa and Anthony Lolli on their journey to transform themselves. After Anthony finally succeeded, TereZa followed — to show all mothers they can look better than ever, even after two children.",
  "From Fat Lolli to 6 Pack Lolli":
    "Obese his entire life, real estate mogul Anthony Lolli accepts his greatest challenge: 125 lbs in nine months, ending on a fitness competition stage. Through blood, sweat and tears, the ultimate transformation story.",
  sHEALed:
    "A four-part saga on women's health — Becoming, Awakening, Rising and Protocols. From the earliest threshold of womanhood, through the gap between women's lived experience and the systems that under-researched it, to a practical guide for every stage of life.",
  "Bye Ol' Dentistry":
    "An experiential documentary exploring biological and holistic dentistry. Through real-time procedures, expert insight and patient journeys, it examines alternatives to conventional practice and the link between oral and overall health.",
  "The New Woo":
    "How practices once dismissed as woo are increasingly being examined, and in some cases supported, by modern science. Through expert insight and real-world experience, the film looks at the intersection of biohacking, spirituality and holistic health.",
};

const films = await payload.find({ collection: "films", limit: 100, depth: 0 });
let filmsWritten = 0;
for (const film of films.docs) {
  const synopsis = SYNOPSIS[film.title as string];
  if (!synopsis || film.synopsis) continue;
  await payload.update({
    collection: "films",
    id: film.id,
    data: { synopsis },
    overrideAccess: true,
  });
  filmsWritten++;
}
console.log(`films: ${filmsWritten} synopses written (${films.docs.length} rows)`);

// ── The press log ───────────────────────────────────────────────────────

type RawAppearance = {
  title: string;
  url: string;
  host: string | null;
  aired: string | null;
  views: number | null;
  views_as_of?: string | null;
  parts: { label: string; url: string }[];
};

const raw = JSON.parse(
  readFileSync(new URL("../data/fampire/appearances.json", import.meta.url), "utf8"),
) as { appearances: RawAppearance[] };

const previews = JSON.parse(
  readFileSync(new URL("../data/fampire/previews.json", import.meta.url), "utf8"),
) as { previews: Record<string, { image: string | null }> };

/**
 * Dates arrive as prose — "February 2, 2025", "Feb 24, 2026" — and the field is
 * a real date so the log sorts correctly regardless of how a month was spelled.
 * An unparseable date is left null rather than guessed: a wrong date in a press
 * log is worse than a missing one, and the page renders an em dash for it.
 */
function parseAired(s: string | null): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

let created = 0;
let updated = 0;
let undated = 0;

for (const a of raw.appearances) {
  const date = parseAired(a.aired);
  if (!date) undated++;

  const data = {
    title: a.title,
    url: a.url,
    outlet: a.host ?? undefined,
    date: date ?? undefined,
    tenant: HOUSE,
    type: "podcast" as const,
    views: a.views ?? undefined,
    viewsAsOf: a.views_as_of ?? undefined,
    thumbnail: previews.previews[`press:${a.url}`]?.image ?? undefined,
    parts: a.parts?.length ? a.parts : undefined,
    _status: "published" as const,
  };

  const existing = await payload.find({
    collection: "appearances",
    where: { url: { equals: a.url } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.update({
      collection: "appearances",
      id: existing.docs[0].id,
      data,
      draft: false,
      overrideAccess: true,
    });
    updated++;
  } else {
    await payload.create({ collection: "appearances", data, draft: false, overrideAccess: true });
    created++;
  }
}

console.log(
  `appearances: ${created} created, ${updated} updated, ${undated} with no air date (of ${raw.appearances.length})`,
);
