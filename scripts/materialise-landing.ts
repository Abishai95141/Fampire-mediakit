import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Write what the page CURRENTLY RENDERS into the page's own arrays.
 *
 * This is the step that was missing, and its absence is the whole complaint.
 * The arrays existed and the fallbacks worked, so the site looked right — but
 * every list was EMPTY, which meant the CMS showed "Add Card" and nothing
 * else. There was no card to select, nothing to reorder, no image to swap.
 * The page was still, in every practical sense, a view of the collections.
 *
 * So: resolve each section's fallback once, and store the result as explicit
 * rows. After this, opening the page in Payload shows four hero cards, eight
 * wordmarks, four people, eight films and six appearances — each a row with
 * its own picture, words and link, each draggable, deletable and duplicable.
 *
 * Every row keeps a `source` pointer, so blank fields still inherit and a
 * portrait updated in People still flows through. But nothing is blank after
 * this: what is on the page is on the page, and editing it edits the page.
 *
 *   DRY_RUN=1 npx payload run scripts/materialise-landing.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (
  await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];

/**
 * ANY page, not just the landing one.
 *
 * This was hardcoded to `/`, which left every other surface unable to be
 * curated at all: /films rendered `loadFilms()` in the collection's own order
 * with an empty `items` array, so there was no row to drag, nothing to
 * replace, and no card to take off the page. The section looked editable —
 * the block is right there in the CMS — and was not.
 *
 *   PAGE=/films npx payload run scripts/materialise-landing.ts
 *   PAGE=all    npx payload run scripts/materialise-landing.ts
 */
const WANT = (process.env.PAGE ?? "/").trim();

const pages = (
  await api.find({
    collection: "pages",
    where: WANT === "all" ? {} : { slug: { equals: WANT } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })
).docs;
if (!pages.length) throw new Error(`no page matching '${WANT}'`);

const find = async (collection: string, where: Record<string, unknown> = {}, sort?: string) =>
  (await api.find({ collection, where, limit: 500, depth: 0, overrideAccess: true, ...(sort ? { sort } : {}) })).docs;

const people = await find("people");
const bySlug = new Map((people as { slug: string }[]).map((p) => [p.slug, p]));
const family = ["anthony", "tereza", "love", "legend"]
  .map((s) => bySlug.get(s))
  .filter(Boolean) as { id: number; slug: string; name: string; role?: string; bio?: string; portraitUrl?: string }[];

const brands = await find("brands", {}, "name");
const films = await find("films", {}, "-awards");
/**
 * Sorted by `_order`, NOT by date.
 *
 * `_order` is the curated drag order the press section already renders in.
 * Sorting by `-date` here looked equivalent and was not: Payload puts undated
 * rows FIRST, so "The Passionate Few" — the one appearance with no air date —
 * jumped from the end of the list to second, and materialising silently
 * reordered the section it was supposed to preserve.
 */
const appearances = await find("appearances", {}, "_order");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
for (const page of pages as any[]) {
console.log(`\n${page.slug}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const layout = ((page.layout ?? []) as any[]).map((b) => {
  switch (b.blockType) {
    case "deckHero":
      if (b.cards?.length) return b;
      return {
        ...b,
        cards: family.map((p) => ({
          source: p.id,
          imageUrl: p.portraitUrl ?? null,
          name: p.name,
          caption: p.role ?? null,
          href: `/library?subject=${p.slug}`,
        })),
      };

    case "brandStrip":
      if (b.items?.length) return b;
      return {
        ...b,
        items: (brands as { id: number; name: string; slug: string }[]).map((x) => ({
          source: x.id,
          label: x.name,
          href: `/library?brand=${x.slug}`,
        })),
      };

    case "peopleRow":
      if (b.cards?.length) return b;
      return {
        ...b,
        cards: family.map((p) => ({
          source: p.id,
          imageUrl: p.portraitUrl ?? null,
          name: p.name,
          role: p.role ?? null,
          bio: p.bio ?? null,
          href: `/library?subject=${p.slug}`,
        })),
      };

    case "filmStrip":
      if (b.items?.length) return b;
      return {
        ...b,
        items: (films as {
          id: number; title: string; synopsis?: string; year?: number; awards?: number;
          status?: string; posterUrl?: string; watch?: { platform: string; url: string; free?: boolean }[];
        }[]).map((f) => ({
          source: f.id,
          imageUrl: f.posterUrl ?? null,
          title: f.title,
          synopsis: f.synopsis ?? null,
          year: f.year ?? null,
          awards: f.awards ?? null,
          status: f.status ?? null,
          // Copied so an editor can retitle or drop one here without touching
          // the film; an empty array would mean "inherit" rather than "none".
          watch: (f.watch ?? []).map((w) => ({ platform: w.platform, url: w.url, free: !!w.free })),
        })),
      };

    case "pressList":
      if (b.items?.length) return b;
      /**
       * The block's OWN limit, not a number baked in here.
       *
       * This used to materialise a fixed six, because that is what the
       * landing page's teaser shows. Running it on /press — the FULL press
       * log, which sets no limit — therefore cut fifty-eight appearances down
       * to six and called it curation. The page had been right precisely
       * because it had no rows and fell back to the whole collection.
       *
       * The rule for every section is the same: materialise what the block
       * WOULD have rendered, so the page looks identical the moment before
       * and the moment after.
       */
      return {
        ...b,
        items: ((b.limit ? appearances.slice(0, Number(b.limit)) : appearances) as {
          id: number; title: string; outlet?: string; date?: string; thumbnail?: string; url?: string;
        }[]).map((a) => ({
          source: a.id,
          imageUrl: a.thumbnail ?? null,
          title: a.title,
          outlet: a.outlet ?? null,
          when: a.date ? new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null,
          url: a.url ?? null,
        })),
      };

    case "statementSplit":
      if (b.pictures?.length) return b;
      return {
        ...b,
        pictures: family.slice(0, 2).map((p) => ({
          source: p.id,
          imageUrl: p.portraitUrl ?? null,
          name: p.name,
        })),
      };

    default:
      return b;
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
for (const b of layout as any[]) {
  const n =
    b.cards?.length ?? b.items?.length ?? b.pictures?.length ?? b.recaps?.length ?? b.lanes?.length ?? b.lines?.length ?? 0;
  console.log(`  ${String(b.blockType).padEnd(16)} ${n ? `${n} editable row(s)` : "—"}`);
}

if (DRY) continue;

await api.update({ collection: "pages", id: page.id, data: { layout }, depth: 0, overrideAccess: true, user: admin });
/* `update` on a drafts-enabled collection writes a DRAFT. Without this the
   rows exist and the live page still renders the old fallback, which reads
   as "the script did nothing". */
if (page._status === "published") {
  await api.update({ collection: "pages", id: page.id, data: { _status: "published" }, depth: 0, overrideAccess: true, user: admin });
}
}

console.log(
  DRY
    ? "\n[DRY RUN] nothing written"
    : `\n${pages.length} page(s) materialised — every element is now a row you can drag, edit or delete`,
);
process.exit(0);
