import Link from "next/link";

import PortraitDeck, { type DeckCard } from "@/components/fampire/blocks/PortraitDeck";
import type { AccordionFilm } from "@/components/fampire/blocks/FilmAccordion";
import type { RosterPerson } from "@/components/fampire/blocks/PeopleRoster";
import type { ProgressionItem } from "@/components/fampire/blocks/PressProgression";
import type { SplitPortrait } from "@/components/fampire/blocks/StatementSplit";
import { applyFacets, facetsFromParams, previewsForSubjects } from "@/lib/fampire/catalog";
import { loadBrands, loadEntries, loadFamily, loadPeople } from "@/lib/fampire/payload-catalog";
import type { AppearanceRecord, FilmRecord } from "@/lib/fampire/payload-catalog";
import type { PersonRecord } from "@/lib/fampire/payload-catalog";

/**
 * The two blocks the approved landing layout needs that the Media Center did
 * not already have: the fanned portrait hero, and the brand strip.
 *
 * Both read the CMS rather than taking uploaded artwork, which is the whole
 * point of the brief — a person or a brand added in Payload appears here with
 * nothing to edit on the page.
 */

const chosen = (url?: string | null, upload?: { url?: string } | string | null): string | null => {
  if (typeof url === "string" && url.trim()) return url.trim();
  if (upload && typeof upload === "object" && upload.url) return upload.url;
  return null;
};

/** Resolve a person to a picture the same way the People page does: a
 *  hand-set portrait beats a frame borrowed from their collections. */
async function toCards(people: PersonRecord[]): Promise<DeckCard[]> {
  const shots = previewsForSubjects(await loadEntries(), people.map((p) => p.slug));
  return people.map((p) => ({
    slug: p.slug,
    name: p.name,
    src: chosen(p.portraitUrl, p.portraitImage) ?? shots[p.slug] ?? null,
  }));
}

export async function DeckHeroBlock({
  wordmark,
  headline,
  headlineTail,
  rail,
  note,
  peopleSlugs,
}: {
  wordmark: string;
  headline?: string | null;
  headlineTail?: string | null;
  rail?: string | null;
  note?: string | null;
  peopleSlugs: string[];
}) {
  /**
   * Empty relationship means "the family", matching how `peopleRow` already
   * behaves. It is also what makes the brief's auto-inclusion promise true:
   * nobody has to remember to add the new person to the hero as well.
   *
   * Capped at five — the measured count in the approved layout, and the point
   * past which the fan stops reading as a fan and starts covering the mark.
   */
  const all = peopleSlugs.length
    ? (await loadPeople()).filter((p) => peopleSlugs.includes(p.slug))
    : await loadFamily();
  const cards = await toCards(all.slice(0, 5));

  return (
    <section className="relative overflow-hidden pt-14 pb-8 sm:pt-20">
      <div className="z-wrap">
        <div className="flex gap-6">
          {rail ? (
            <div className="hidden shrink-0 items-end lg:flex" aria-hidden>
              <span className="z-rail">{rail}</span>
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {headline ? (
              <h2 className="z-h3 max-w-[15ch]">
                {headline}
                {headlineTail ? (
                  <span style={{ color: "var(--z-muted)" }}> {headlineTail}</span>
                ) : null}
              </h2>
            ) : null}

            <div className="mt-8 sm:mt-10">
              <PortraitDeck cards={cards} />
            </div>

            {/* Clearance, not decoration. With the deck widened, the lower
                corner of the outermost card reached into the wordmark's box —
                the geometry pass flagged "FAMPIRE" as sitting under a picture.
                The fan is meant to sit ABOVE the mark, not touch it. */}
            <div className="mt-14 flex flex-col items-start justify-between gap-6 sm:mt-20 sm:flex-row sm:items-end">
              {/* The oversized mark. `h1` because on the landing page this
                  IS the page's heading, not decoration. */}
              <h1 className="z-wordmark">{wordmark}</h1>
              {note ? <p className="z-body max-w-[38ch] sm:text-right">{note}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function BrandStripBlock({
  label,
  brandSlugs,
  marquee = true,
}: {
  label?: string | null;
  brandSlugs: string[];
  marquee?: boolean;
}) {
  const all = await loadBrands();
  const shown = brandSlugs.length ? all.filter((b) => brandSlugs.includes(b.slug)) : all;
  if (!shown.length) return null;

  const Wordmark = ({ b }: { b: { slug: string; name: string } }) => (
    <Link
      href={`/library?brand=${encodeURIComponent(b.slug)}`}
      className="shrink-0 px-7 text-[clamp(18px,2.1vw,26px)] font-medium tracking-[-0.02em] opacity-55 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      style={{ color: "var(--z-ink)" }}
    >
      {b.name}
    </Link>
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="z-wrap">
        {label ? <p className="z-label mb-7 text-center">{label}</p> : null}
      </div>

      {marquee ? (
        /* Two identical tracks, translated by exactly -50%, so the loop has
           no visible seam. The duplicate is hidden from assistive tech so the
           brand names are not announced twice. */
        <div className="relative overflow-hidden" style={{ maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)" }}>
          <div className="z-marquee">
            <div className="flex items-center">
              {shown.map((b) => <Wordmark key={b.slug} b={b} />)}
            </div>
            <div className="flex items-center" aria-hidden>
              {shown.map((b) => <Wordmark key={`dup-${b.slug}`} b={b} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="z-wrap flex flex-wrap items-center justify-center gap-y-4">
          {shown.map((b) => <Wordmark key={b.slug} b={b} />)}
        </div>
      )}
    </section>
  );
}


// ── Data helpers for the other approved layouts ─────────────────────────

/** People, resolved for the roster: name, role, bio and a picture. */
export async function rosterPeople(people: PersonRecord[]): Promise<RosterPerson[]> {
  const shots = previewsForSubjects(await loadEntries(), people.map((p) => p.slug));
  return people.map((p) => ({
    slug: p.slug,
    name: p.name,
    role: p.role ?? null,
    bio: (p as { bio?: string | null }).bio ?? null,
    src: chosen(p.portraitUrl, p.portraitImage) ?? shots[p.slug] ?? null,
  }));
}

/**
 * Two portraits for a split statement.
 *
 * An empty relationship falls back to the first two family members rather than
 * rendering blank panels, so the block is safe to drop onto a page before
 * anyone has chosen who should appear in it.
 */
export async function splitPortraits(slugs: string[]): Promise<[SplitPortrait | null, SplitPortrait | null]> {
  const pool = slugs.length
    ? (await loadPeople()).filter((p) => slugs.includes(p.slug))
    : await loadFamily();
  const cards = await toCards(pool.slice(0, 2));
  return [cards[0] ?? null, cards[1] ?? null];
}

/**
 * How much sits behind each intent lane.
 *
 * A lane is a pre-filtered Library URL, so the count is produced by running
 * that exact filter through the Library's own `facetsFromParams` and
 * `applyFacets` rather than a second, drifting reading of the query string.
 * The number therefore cannot disagree with the page the lane opens.
 *
 * This replaced a per-lane image. Choosing a picture for a FILTER meant
 * grabbing whatever sat at the top of it, which put a documentary about cats
 * in front of "Book them"; a count is the thing a lane can honestly state
 * about itself.
 */
export async function laneCounts(
  lanes: { label: string; detail?: string | null; href: string }[],
): Promise<{ label: string; detail?: string | null; href: string; collections: number; files: number }[]> {
  const entries = await loadEntries();

  return lanes.map((l) => {
    const qs = l.href.includes("?") ? l.href.slice(l.href.indexOf("?") + 1) : "";
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(qs)) params[k] = v;
    const matched = applyFacets(entries, facetsFromParams(params));
    return {
      ...l,
      collections: matched.length,
      files: matched.reduce((n, e) => n + (e.file_count ?? 0), 0),
    };
  });
}

/**
 * Films, resolved for the accordion.
 *
 * Key art falls back to a frame from the film's own collections, the same rule
 * portraits follow — a film with no uploaded poster still shows a picture from
 * its own material rather than a grey box.
 */
export async function accordionFilms(films: FilmRecord[]): Promise<AccordionFilm[]> {
  const entries = await loadEntries();
  return films.map((f) => {
    /**
     * Ranked, not just biggest.
     *
     * Taking the largest collection gave The Guru a landscape behind-the-scenes
     * frame of a cinema audience as its "key art". Key art first, then a
     * trailer frame, then anything — and only inside that band does size
     * decide. Three films (The Guru, Biohack Yourself, sHEALed) have no key art
     * in the archive at all, so for those this is openly a still from their own
     * material rather than a poster, which is why the rail is not shaped like
     * one.
     */
    const rank = (k: string) => (k === "poster" ? 0 : k === "trailer" ? 1 : k === "BTS" ? 2 : 3);
    const own = entries
      .filter((e) => e.film === f.title && e.image)
      .sort((a, b) => rank(a.kind) - rank(b.kind) || (b.file_count ?? 0) - (a.file_count ?? 0));
    return {
      slug: f.slug,
      title: f.title,
      synopsis: f.synopsis ?? null,
      note: f.note ?? null,
      year: f.year ?? null,
      awards: f.awards ?? null,
      status: f.status ?? null,
      poster: chosen(f.posterUrl, f.posterImage) ?? own[0]?.image ?? null,
      watch: f.watch ?? null,
    };
  });
}

/** Appearances, flattened for the numbered progression. Synchronous — the
 *  records are already loaded by the time the block renders. */
export function progressionItems(list: AppearanceRecord[]): ProgressionItem[] {
  return list.map((a) => ({
    title: a.title,
    outlet: a.outlet ?? null,
    aired: a.aired ?? null,
    views: a.views ?? null,
    thumbnail: a.thumbnail ?? null,
    url: a.url ?? null,
  }));
}
