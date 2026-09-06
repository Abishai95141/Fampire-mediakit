import Link from "next/link";

import ItemControls from "@/components/fampire/ItemControls";
import PortraitDeck, { type DeckCard } from "@/components/fampire/blocks/PortraitDeck";
import type { AccordionFilm } from "@/components/fampire/blocks/FilmAccordion";
import type { RosterPerson } from "@/components/fampire/blocks/PeopleRoster";
import type { ProgressionItem } from "@/components/fampire/blocks/PressProgression";
import type { SplitPortrait } from "@/components/fampire/blocks/StatementSplit";
import { applyFacets, facetsFromParams, previewsForSubjects } from "@/lib/fampire/catalog";
import { pick, picture, refDoc, refId, type Ref } from "@/lib/fampire/page-items";
import { loadBrands, loadEntries, loadFamily, loadPeople } from "@/lib/fampire/payload-catalog";
import type { AppearanceRecord, FilmRecord } from "@/lib/fampire/payload-catalog";
import type { BrandRecord, PersonRecord } from "@/lib/fampire/payload-catalog";

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
    id: p.id ?? null,
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
  rows,
  signedIn = false,
  pageId,
  blockIndex,
  hidden,
}: {
  wordmark: string;
  headline?: string | null;
  headlineTail?: string | null;
  rail?: string | null;
  note?: string | null;
  peopleSlugs: string[];
  /** The block's own card list. Present means "the page owns this section". */
  rows?: Record<string, unknown>[];
  signedIn?: boolean;
  pageId?: number | string;
  blockIndex?: number;
  hidden?: Set<string>;
}) {
  /**
   * Empty relationship means "the family", matching how `peopleRow` already
   * behaves. It is also what makes the brief's auto-inclusion promise true:
   * nobody has to remember to add the new person to the hero as well.
   *
   * Capped at five — the measured count in the approved layout, and the point
   * past which the fan stops reading as a fan and starts covering the mark.
   */
  /**
   * Page-owned cards win outright.
   *
   * When the block carries its own list, the hero renders THAT — each row's
   * picture, name and link, falling back per-field to whatever person the row
   * points at. Nothing here reads the family unless the list is empty, which
   * is what keeps "edit a card" from meaning "edit a family member".
   */
  let cards: DeckCard[];
  if (rows?.length) {
    const shots = previewsForSubjects(await loadEntries(), []);
    void shots;
    cards = rows.slice(0, 5).map((r, i) => {
      const src = refDoc<PersonRecord>(r.source as Ref);
      return {
        id: refId(r.source as Ref),
        slug: pick(src?.slug) ?? `card-${i}`,
        name: pick(r.name as string, src?.name) ?? "",
        src: picture(r.image as Ref, r.imageUrl as string, src?.portraitUrl),
        href: pick(r.href as string) ?? (src?.slug ? `/library?subject=${encodeURIComponent(src.slug)}` : null),
        caption: pick(r.caption as string),
      };
    });
  } else {
    const all = peopleSlugs.length
      ? (await loadPeople()).filter((p) => peopleSlugs.includes(p.slug))
      : await loadFamily();
    cards = await toCards(all.filter((p) => !hidden?.has(String(p.id))).slice(0, 5));
  }

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
              <PortraitDeck
                cards={cards}
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={blockIndex}
              />
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
  rows,
  marquee = true,
  signedIn = false,
  pageId,
  blockIndex,
  hidden,
}: {
  label?: string | null;
  brandSlugs: string[];
  /** The block's own wordmark list. */
  rows?: Record<string, unknown>[];
  marquee?: boolean;
  signedIn?: boolean;
  pageId?: number | string;
  blockIndex?: number;
  hidden?: Set<string>;
}) {
  const all = await loadBrands();
  // The page's own list wins; the collection is only the fallback.
  const shown: BrandRecord[] = rows?.length
    ? rows.map((r, i) => {
        const src = refDoc<BrandRecord>(r.source as Ref);
        return {
          id: refId(r.source as Ref) ?? `row-${i}`,
          name: pick(r.label as string, src?.name) ?? "",
          slug: pick(r.href as string, src?.slug) ?? "",
        } as BrandRecord;
      }).filter((b) => b.name)
    : (brandSlugs.length ? all.filter((b) => brandSlugs.includes(b.slug)) : all).filter(
        (b) => !hidden?.has(String(b.id)),
      );
  if (!shown.length) return null;

  const Wordmark = ({ b, controls = false }: { b: BrandRecord; controls?: boolean }) => (
    <span className={controls && signedIn ? "fam-item shrink-0" : "shrink-0"}>
      <Link
        href={b.slug.startsWith("/") ? b.slug : `/library?brand=${encodeURIComponent(b.slug)}`}
        className="block px-7 text-[clamp(18px,2.1vw,26px)] font-medium tracking-[-0.02em] opacity-55 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        style={{ color: "var(--z-ink)" }}
      >
        {b.name}
      </Link>
      {controls ? (
        <ItemControls
          signedIn={signedIn}
          pageId={pageId}
          blockIndex={blockIndex}
          collection="brands"
          id={b.id}
          label={b.name}
        />
      ) : null}
    </span>
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
              {shown.map((b) => <Wordmark key={b.slug} b={b} controls />)}
            </div>
            <div className="flex items-center" aria-hidden>
              {shown.map((b) => <Wordmark key={`dup-${b.slug}`} b={b} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="z-wrap flex flex-wrap items-center justify-center gap-y-4">
          {shown.map((b) => <Wordmark key={b.slug} b={b} controls />)}
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
    id: p.id ?? null,
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
      id: f.id ?? null,
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


// ── Page-owned resolvers for the remaining sections ─────────────────────

/**
 * People cards the page owns.
 *
 * Same contract as the hero: what is typed on the row wins, what is left
 * blank falls back to the person it points at, and the Person record is never
 * written. `id` is the SOURCE record's id, so the per-item "Edit" link still
 * takes you to the right place when there is one — a card invented on the
 * page has no record to edit and correctly offers no link.
 */
export async function rowsToRoster(rows: Record<string, unknown>[]): Promise<RosterPerson[]> {
  const entries = await loadEntries();
  return rows.map((r, i) => {
    const src = refDoc<PersonRecord>(r.source as Ref);
    const shot = src?.slug ? previewsForSubjects(entries, [src.slug])[src.slug] : null;
    return {
      id: refId(r.source as Ref),
      slug: pick(src?.slug) ?? `card-${i}`,
      name: pick(r.name as string, src?.name) ?? "",
      role: pick(r.role as string, src?.role),
      bio: pick(r.bio as string, (src as { bio?: string } | null)?.bio),
      src: picture(r.image as Ref, r.imageUrl as string, src?.portraitUrl, shot),
      href: pick(r.href as string),
    };
  });
}

/** Film rows the page owns. */
export async function rowsToFilms(rows: Record<string, unknown>[]): Promise<AccordionFilm[]> {
  const entries = await loadEntries();
  return rows.map((r, i) => {
    const src = refDoc<FilmRecord>(r.source as Ref);
    const own = src?.title
      ? entries.filter((e) => e.film === src.title && e.image).sort((a, b) => (b.file_count ?? 0) - (a.file_count ?? 0))
      : [];
    const watch = (r.watch as { platform: string; url: string; free?: boolean }[]) ?? [];
    return {
      id: refId(r.source as Ref),
      slug: pick(src?.slug) ?? `row-${i}`,
      title: pick(r.title as string, src?.title) ?? "",
      synopsis: pick(r.synopsis as string, src?.synopsis),
      note: pick(src?.note),
      year: (r.year as number) ?? src?.year ?? null,
      awards: (r.awards as number) ?? src?.awards ?? null,
      status: pick(r.status as string, src?.status),
      poster: picture(r.image as Ref, r.imageUrl as string, src?.posterUrl, own[0]?.image),
      // An empty array means "no override", not "no links".
      watch: watch.length ? watch : src?.watch ?? null,
    };
  });
}

/** Press rows the page owns. */
export function rowsToProgression(rows: Record<string, unknown>[]): ProgressionItem[] {
  return rows.map((r) => {
    const src = refDoc<AppearanceRecord>(r.source as Ref);
    return {
      title: pick(r.title as string, src?.title) ?? "",
      outlet: pick(r.outlet as string, src?.outlet),
      // `when` is free text on the page; the record's own date is a date.
      aired: pick(r.when as string, src?.aired),
      views: src?.views ?? null,
      thumbnail: picture(r.image as Ref, r.imageUrl as string, src?.thumbnail),
      url: pick(r.url as string, src?.url),
    };
  });
}


/**
 * The split statement's two pictures, owned by the page.
 *
 * Same contract as every other section: a row's own image wins, a blank field
 * falls back to the person it points at, and the Person record is never
 * written. A row with no source at all is a picture that exists on this page
 * and nowhere else — which is the whole point, because these two are a
 * composition choice rather than a statement about who the family is.
 */
export async function rowsToSplitPortraits(
  rows: Record<string, unknown>[],
): Promise<[SplitPortrait | null, SplitPortrait | null]> {
  const entries = await loadEntries();
  const out = rows.slice(0, 2).map((r) => {
    const src = refDoc<PersonRecord>(r.source as Ref);
    const shot = src?.slug ? previewsForSubjects(entries, [src.slug])[src.slug] : null;
    return {
      name: pick(r.name as string, src?.name) ?? "",
      src: picture(r.image as Ref, r.imageUrl as string, src?.portraitUrl, shot),
    } as SplitPortrait;
  });
  return [out[0] ?? null, out[1] ?? null];
}
