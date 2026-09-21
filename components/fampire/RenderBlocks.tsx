import Link from "next/link";

import BlockEdit from "@/components/fampire/BlockEdit";
import { picture, type Ref } from "@/lib/fampire/page-items";
import { RichText as LexicalRichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

import EntryCard from "@/components/fampire/EntryCard";
import HeroVideo from "@/components/fampire/HeroVideo";
import Section from "@/components/fampire/Section";
import SearchBar from "@/components/fampire/SearchBar";
import LibraryBrowser from "@/components/fampire/LibraryBrowser";
import {
  FilmProfiles,
  MagazineShelf,
  PeopleProfiles,
  PressLog,
  WatchGrid,
  type AppearanceRecord,
} from "@/components/fampire/blocks/CatalogBlocks";
import {
  BrandStripBlock,
  DeckHeroBlock,
  accordionFilms,
  laneCounts,
  rowsToAppearanceRecords,
  rowsToFilmRecords,
  rowsToFilms,
  rowsToPersonRecords,
  rowsToProgression,
  rowsToRoster,
  rowsToSplitPortraits,
  progressionItems,
  rosterPeople,
  splitPortraits,
} from "@/components/fampire/blocks/ZeenBlocks";
import FilmAccordion from "@/components/fampire/blocks/FilmAccordion";
import PeopleRoster from "@/components/fampire/blocks/PeopleRoster";
import PeopleStack from "@/components/fampire/blocks/PeopleStack";
import RecapCoverflow, { type CoverRecap } from "@/components/fampire/blocks/RecapCoverflow";
import ScrollStatement from "@/components/fampire/blocks/ScrollStatement";
import RecapRow, { type Recap } from "@/components/fampire/blocks/RecapRow";
import PressProgression from "@/components/fampire/blocks/PressProgression";
import PhaseLanes from "@/components/fampire/blocks/PhaseLanes";
import StatementSplit from "@/components/fampire/blocks/StatementSplit";
import {
  applyFacets,
  loadAppearances,
  loadEntries,
  loadFamily,
  loadFilms,
  loadPeople,
  loadWatchLinks,
  type Entry,
  type Facets,
} from "@/lib/fampire/catalog";
import { HERO, heroSkeleton } from "@/lib/fampire/media";
import { parseVideo } from "@/lib/fampire/video";
import { heroEmbedStatus } from "@/lib/fampire/hero";

/**
 * Renders a CMS page's blocks.
 *
 * The contract with `collections/blocks.ts`: every block type there must have
 * a case here, and an unknown block renders nothing rather than throwing —
 * an editor adding a block this deploy does not understand should see a gap,
 * not a 500 on a public press page.
 *
 * Two things this file is responsible for that it previously was not:
 *
 * 1. THE DESIGN. Every block used to render in plain Tailwind — a hero was
 *    `text-5xl font-semibold`, centred, on no ground. So the pages that were
 *    editable looked visibly worse than the pages that were hardcoded, which
 *    taught the media team that using the CMS degrades the site. Every case
 *    below now renders through the same `fam-*` system and the same
 *    components as the designed surfaces, because a page builder nobody
 *    trusts is not a page builder.
 *
 * 2. REAL RICH TEXT. `richText` was flattened to a string by a hand-rolled
 *    tree walk, so bold, links, headings and lists all silently disappeared.
 *    It goes through the official Lexical serialiser now.
 *
 * The card blocks query the catalog LIVE rather than storing copies of
 * entries, which is what keeps §4.5 rule 3 honest: a narrative page embeds
 * real collection cards and cannot drift out of date relative to them.
 */

type Block = Record<string, unknown> & { blockType?: string };
type Rel = { id?: number | string; slug?: string; title?: string; name?: string } | number | null;

const relSlug = (r: Rel) => (r && typeof r === "object" ? r.slug : undefined);

/**
 * Row ids taken off this page by a block's `hidden` list.
 *
 * Compared as strings because Payload hands relationships back as either a
 * bare id or a populated object depending on depth, and a number-vs-string
 * mismatch here would silently hide nothing.
 */
const hiddenIds = (block: Block): Set<string> =>
  new Set(
    ((block.hidden as unknown[]) ?? [])
      .map((v) => (v && typeof v === "object" ? (v as { id: unknown }).id : v))
      .filter((v) => v != null)
      .map(String),
  );

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function entriesFor(filters: Record<string, unknown>, sort: string, limit: number) {
  const all = await loadEntries();

  const kinds = (filters.kind as string[] | undefined) ?? [];
  const occasions = (filters.occasion as string[] | undefined) ?? [];

  let pool = all;
  if (kinds.length) pool = pool.filter((e) => kinds.includes(e.kind));
  if (occasions.length) pool = pool.filter((e) => e.occasion && occasions.includes(e.occasion));
  if (filters.year) pool = pool.filter((e) => e.year === Number(filters.year));

  // The other half of the vertical/horizontal bug: the block schema was
  // missing this field AND the renderer never read it, so a page asking for
  // vertical b-roll silently received everything.
  const orientations = (filters.orientation as string[] | undefined) ?? [];
  if (orientations.length) {
    pool = pool.filter((e) => e.orientation && orientations.includes(e.orientation));
  }

  const brand = relSlug(filters.brand as Rel);
  const film = relSlug(filters.film as Rel);
  const event = relSlug(filters.event as Rel);
  const location = relSlug(filters.location as Rel);
  const people = ((filters.people as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[];

  // `brands` is a list — an entry can belong to more than one world.
  if (brand) pool = pool.filter((e) => e.brands.includes(brand));
  if (film) pool = pool.filter((e) => e.film && slugify(e.film) === film);
  if (event) pool = pool.filter((e) => e.event && slugify(e.event) === event);
  if (location) pool = pool.filter((e) => e.location && slugify(e.location) === location);
  if (people.length) {
    pool = pool.filter((e) => people.some((p) => e.subjects.includes(p)));
  }

  // Anything flagged as containing a minor can be excluded wholesale by an
  // editor building a page — confirmed or not (§9.1).
  if (filters.excludeMinors) pool = pool.filter((e) => !e.contains_minor);

  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  pool = [...pool].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[key];
    const bv = (b as unknown as Record<string, unknown>)[key];
    if (typeof av === "number" && typeof bv === "number") return desc ? bv - av : av - bv;
    return desc
      ? String(bv ?? "").localeCompare(String(av ?? ""))
      : String(av ?? "").localeCompare(String(bv ?? ""));
  });

  return pool.slice(0, limit || 6);
}

function Cards({ entries, layout }: { entries: Entry[]; layout?: string }) {
  const grid =
    layout === "row"
      ? "flex gap-8 overflow-x-auto pb-2 [&>li]:w-[22rem] [&>li]:shrink-0"
      : layout === "list"
        ? "flex flex-col gap-4"
        : layout === "spotlight"
          ? "grid gap-6"
          : "grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={grid} data-lenis-prevent={layout === "row" ? "" : undefined}>
      {entries.map((e) => (
        <li key={e.id}>
          <EntryCard entry={e} signedIn={false} />
        </li>
      ))}
    </ul>
  );
}

export default async function RenderBlocks({
  blocks,
  facets,
  signedIn = false,
  pageId,
}: {
  blocks: unknown;
  /** Present only on pages that carry a Library browser. */
  facets?: Facets;
  signedIn?: boolean;
  /** The page these blocks belong to, so each section's edit handle can link
   *  straight back to the right record. */
  pageId?: number | string;
}) {
  const list = Array.isArray(blocks) ? (blocks as Block[]) : [];

  /**
   * Section numbering counts only the blocks that carry a numbered head.
   *
   * Numbering by array index meant a divider or a hero consumed a number, so
   * a page ran "01 — … 03 — … 06 — …". The numbers are the page's spine; gaps
   * in them read as missing sections.
   */
  let sectionNo = 0;
  const NUMBERED = new Set([
    "entryQuery", "entryPicks", "lanes", "stats", "filmStrip", "peopleRow",
    "magazineShelf", "watchGrid", "copyBlock", "faq", "cta", "embed",
  ]);
  const numbers = list.map((b) =>
    NUMBERED.has(String(b.blockType)) ? String(++sectionNo).padStart(2, "0") : "",
  );

  /**
   * Each block is rendered, then WRAPPED — rather than every one of the
   * twenty-odd cases below having to remember an edit handle of its own.
   * `renderOne` is the switch exactly as it was; the wrapper adds the handle
   * and the positioning context it needs.
   */
  const renderOne = async (block: Block, i: number) => {
      const key = `${block.blockType}-${i}`;
      const n = numbers[i]!;
      const headingText = String(block.heading ?? "");
      const introText = block.intro ? String(block.intro) : undefined;

      switch (block.blockType) {
        /**
         * The front door: film major, information beside it.
         *
         * Type over moving footage is unreadable at any scrim strength — the
         * picture keeps changing underneath it — so the two never overlap and
         * the masthead stays white and opaque above both.
         */
        /* The approved landing layout's opening frame. Both of the Zeen
           blocks resolve their own CMS reads inside the component, so this
           case only forwards what the editor chose. */
        case "deckHero":
          return (
            <DeckHeroBlock
              key={key}
              signedIn={signedIn}
              pageId={pageId}
              blockIndex={i}
              hidden={hiddenIds(block)}
              rows={(block.cards as Record<string, unknown>[]) ?? undefined}
              wordmark={String(block.wordmark ?? "FAMPIRE")}
              headline={block.headline as string | null}
              headlineTail={block.headlineTail as string | null}
              rail={block.rail as string | null}
              note={block.note as string | null}
              peopleSlugs={((block.people as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[]}
            />
          );

        case "brandStrip":
          return (
            <BrandStripBlock
              key={key}
              signedIn={signedIn}
              pageId={pageId}
              blockIndex={i}
              hidden={hiddenIds(block)}
              rows={(block.items as Record<string, unknown>[]) ?? undefined}
              label={block.label as string | null}
              brandSlugs={((block.brands as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[]}
              marquee={block.marquee !== false}
            />
          );

        case "recapRow": {
          /**
           * The Drive file id, pulled out of whatever the editor pasted.
           * Handles /file/d/<id>/view, ?id=<id>, /d/<id>, and a bare id — an
           * editor should not have to know which of Drive's URL shapes the
           * Share button happened to give them.
           */
          const fileId = (raw: string): string | null => {
            const u = String(raw ?? "").trim();
            if (!u) return null;
            const m =
              u.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) ??
              u.match(/[?&]id=([A-Za-z0-9_-]{10,})/) ??
              u.match(/\/d\/([A-Za-z0-9_-]{10,})/);
            if (m) return m[1]!;
            return /^[A-Za-z0-9_-]{10,}$/.test(u) ? u : null;
          };

          const rows = ((block.recaps as Record<string, unknown>[]) ?? [])
            .map((r, i): CoverRecap | null => {
              const id = fileId(String(r.url ?? ""));
              if (!id) return null;
              const poster =
                (typeof r.posterUrl === "string" && r.posterUrl.trim()
                  ? r.posterUrl.trim()
                  : null) ?? `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
              return {
                id: `${id}-${i}`,
                fileId: id,
                who: String(r.who ?? ""),
                blurb: (r.blurb as string) ?? null,
                when: (r.when as string) ?? null,
                poster,
                videoUrl: (r.videoUrl as string) ?? null,
                stripUrl: (r.stripUrl as string) ?? null,
              };
            })
            .filter(Boolean) as CoverRecap[];

          if (!rows.length) return null;

          /* The turntable brings its own header, ticker and index rail, so it
             is not wrapped in `Section` — a numbered rule above it would sit
             on top of the black band it opens with. */
          if (block.layout === "coverflow") {
            return (
              <RecapCoverflow
                key={key}
                heading={headingText}
                intro={introText}
                margin={block.margin as string | null}
                recaps={rows}
              />
            );
          }

          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <RecapRow recaps={rows as Recap[]} />
            </Section>
          );
        }

        case "scrollExpand": {
          const img = picture(block.image as Ref, block.imageUrl as string);
          if (!img) return null;
          return (
            <ScrollStatement
              key={key}
              src={img}
              alt={block.alt as string | null}
              title={block.title as string | null}
              scrollHint={block.scrollHint as string | null}
              lines={((block.lines as { text: string }[]) ?? []).map((l) => l.text).filter(Boolean)}
              notes={((block.notes as { text: string }[]) ?? []).filter((n) => n?.text)}
              startWidth={block.startWidth as number | null}
              startHeight={block.startHeight as number | null}
              mediaZoom={block.mediaZoom as number | null}
              scrollDistance={block.scrollDistance as number | null}
            />
          );
        }

        case "statementSplit": {
          const lines = ((block.lines as { text: string }[]) ?? []).map((l) => l.text).filter(Boolean);
          if (!lines.length) return null;
          /* The page's own pictures win; the relationship is the fallback. */
          const picRows = (block.pictures as Record<string, unknown>[]) ?? [];
          const [pl, pr] = picRows.length
            ? await rowsToSplitPortraits(picRows)
            : await splitPortraits(
                ((block.portraits as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[],
              );
          const inner = (
            <div className="z-wrap">
              <StatementSplit
                lines={lines}
                left={pl}
                right={pr}
                notes={((block.notes as { text: string }[]) ?? []).filter((x) => x?.text)}
                overlap={block.overlap === true}
              />
            </div>
          );
          return block.dark ? (
            <section key={key} className="z-band z-band--dark mt-16 sm:mt-24">{inner}</section>
          ) : (
            <section key={key} className="z-band">{inner}</section>
          );
        }

        case "heroFeature": {
          // An empty text field arrives as "" — falsy, and correctly so: an
          // empty CMS override means "no override", not "an empty video".
          const cmsVideo = String(block.videoId ?? "").trim();
          const parsedHero = cmsVideo ? parseVideo(cmsVideo) : null;
          /**
           * Only probe Vimeo when the CMS is actually pointed at a Vimeo
           * video. No CMS override at all means the self-hosted default
           * (HeroVideo's `fallbackSrc`) — nothing to probe, always plays.
           * A YouTube link embeds without this check by design. And when it
           * IS Vimeo, probe THAT video's id, not a fixed default — every
           * link is its own video with its own privacy setting, and
           * checking a different one meant a working replacement could get
           * silently vetoed by an unrelated video's embed status.
           */
          const hero =
            !cmsVideo || parsedHero?.kind === "youtube"
              ? { embeddable: true }
              : await heroEmbedStatus(parsedHero?.id ?? cmsVideo);
          const stats = (block.stats as { value?: string; label: string; source?: string }[]) ?? [];
          const resolved = await resolveStats(stats);
          const actions = (block.actions as { label: string; href: string; emphasis?: string }[]) ?? [];
          return (
            <section
              key={key}
              className="grid border-b border-fam-rule lg:grid-cols-[minmax(0,1fr)_18.5rem] xl:grid-cols-[minmax(0,1fr)_21rem]"
            >
              {/* 16:9 — the film's own shape, so the whole frame is visible
                  with nothing cropped off the sides. It sets the height of the
                  row; the column beside it distributes into whatever that is. */}
              <div className="relative aspect-video w-full overflow-hidden bg-fam-ink lg:border-r lg:border-fam-rule">
                <HeroVideo
                  embeddable={hero.embeddable}
                  videoId={cmsVideo}
                  fallbackSrc={HERO.selfHostedUrl}
                  poster={heroSkeleton()}
                  title={HERO.title}
                  startAt={Number(block.startAt ?? HERO.startAt)}
                />
              </div>

              {/* Kept narrow on purpose: it is a caption beside the film, not
                  a second hero competing with it for width. */}
              <div className="flex flex-col justify-between gap-8 px-6 py-9 sm:px-10 lg:px-7 lg:py-8 xl:px-9">
                <div>
                  {block.eyebrow ? <p className="fam-eyebrow">{String(block.eyebrow)}</p> : null}
                  {introText ? (
                    <p className="mt-4 text-[14px] leading-[1.6] text-fam-body">{introText}</p>
                  ) : null}
                </div>

                {resolved.length ? (
                  <dl className="divide-y divide-fam-rule border-y border-fam-rule">
                    {resolved.map((s) => (
                      <div key={s.label} className="flex items-baseline justify-between gap-3 py-3">
                        <dt className="fam-display text-[1.9rem] leading-[1.06] tabular-nums">
                          {s.value}
                        </dt>
                        <dd className="fam-meta text-right text-[10px] uppercase tracking-[0.14em] text-fam-muted">
                          {s.label}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {actions.length ? (
                  <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
                    {actions.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        className={`${
                          a.emphasis === "secondary" ? "fam-btn-ghost" : "fam-btn"
                        } justify-center !px-5 !text-[11px]`}
                      >
                        {a.label}
                        {a.emphasis === "secondary" ? null : <span aria-hidden> →</span>}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          );
        }

        case "hero":
          return (
            <header key={key} className="border-b border-fam-rule bg-fam-paper">
              <div className="mx-auto max-w-[1320px] px-6 py-20 sm:px-10 sm:py-28 lg:px-12">
                {block.eyebrow ? <p className="fam-eyebrow">{String(block.eyebrow)}</p> : null}
                <h1 className="fam-display mt-5 max-w-4xl text-[3rem] leading-[1.06] sm:text-[4.5rem]">
                  {headingText}
                </h1>
                {introText ? (
                  <p className="mt-7 max-w-2xl text-[16.5px] leading-[1.65] text-fam-body">
                    {introText}
                  </p>
                ) : null}
                {((block.actions as { label: string; href: string; emphasis?: string }[]) ?? []).length ? (
                  <div className="mt-9 flex flex-wrap gap-3">
                    {((block.actions as { label: string; href: string; emphasis?: string }[]) ?? []).map(
                      (a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          className={a.emphasis === "secondary" ? "fam-btn-ghost" : "fam-btn"}
                        >
                          {a.label}
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </header>
          );

        /** The inverted band that gives a page its spine. */
        case "statement":
          return (
            <section key={key} className="mt-24 bg-fam-ink text-white sm:mt-32">
              <div className="mx-auto grid max-w-[1320px] gap-x-16 gap-y-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-12 lg:px-12">
                <div className="lg:col-span-5">
                  {block.eyebrow ? (
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                      {String(block.eyebrow)}
                    </p>
                  ) : null}
                  <h2 className="fam-display mt-6 text-[2.6rem] leading-[1.08] text-white sm:text-[3.4rem]">
                    {headingText}
                  </h2>
                </div>
                <div className="lg:col-span-6 lg:col-start-7">
                  {block.body ? (
                    <p className="text-[17px] leading-[1.68] text-white/90">{String(block.body)}</p>
                  ) : null}
                  {block.secondary ? (
                    <p className="mt-6 text-[15px] leading-[1.7] text-white/65">
                      {String(block.secondary)}
                    </p>
                  ) : null}
                  {block.actionLabel && block.actionHref ? (
                    <Link
                      href={String(block.actionHref)}
                      className="mt-9 inline-flex items-center gap-2.5 border border-white/45 px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-fam-ink"
                    >
                      {String(block.actionLabel)} <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          );

        case "richText":
          return (
            <div
              key={key}
              className={`mx-auto px-6 py-12 sm:px-10 lg:px-12 ${
                block.width === "full" ? "max-w-[1320px]" : "max-w-3xl"
              }`}
            >
              <RichTextBody value={block.content} />
            </div>
          );

        /**
         * The Library itself.
         *
         * Reads the page's own searchParams, so every filter state stays a
         * real URL that opens server-rendered for whoever it is pasted to.
         */
        case "libraryBrowser": {
          const locked = (block.locked as Record<string, unknown>) ?? {};
          return (
            <LibraryBrowser
              key={key}
              facets={facets ?? {}}
              signedIn={signedIn}
              heading={headingText || undefined}
              intro={introText}
              perPage={Number(block.perPage ?? 60)}
              showFacets={block.showFacets !== false}
              showSearch={block.showSearch !== false}
              showSort={block.showSort !== false}
              showCount={block.showCount !== false}
              locked={{
                brand: relSlug(locked.brand as Rel),
                kind: (locked.kind as string[]) ?? undefined,
                orientation: (locked.orientation as string[]) ?? undefined,
              }}
            />
          );
        }

        case "entryQuery": {
          const entries = await entriesFor(
            (block.filters as Record<string, unknown>) ?? {},
            String(block.sort ?? "-fileCount"),
            Number(block.limit ?? 6),
          );
          if (!entries.length) return null;
          return (
            <Section
              key={key}
              n={n}
              title={headingText}
              aside={introText}
              href={block.viewAll ? String(block.viewAll) : undefined}
              hrefLabel={block.viewAll ? "See all" : undefined}
            >
              <Cards entries={entries} layout={String(block.layout ?? "grid")} />
            </Section>
          );
        }

        case "entryPicks": {
          const picked = ((block.entries as Rel[]) ?? []).filter(
            (r) => r && typeof r === "object",
          ) as unknown as Entry[];
          if (!picked.length) return null;
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <Cards entries={picked} layout={String(block.layout ?? "grid")} />
            </Section>
          );
        }

        case "lanes": {
          const laneRows =
            (block.lanes as { label: string; detail?: string; href: string }[]) ?? [];
          /* The ledger needs a live count per lane, taken from the very
             filter the lane opens — so the number on the card and the page it
             leads to can never disagree. */
          if (block.layout === "phases") {
            return (
              <Section key={key} n={n} title={headingText} aside={introText}>
                <PhaseLanes lanes={await laneCounts(laneRows)} />
              </Section>
            );
          }
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {((block.lanes as { label: string; detail?: string; href: string }[]) ?? []).map(
                  (l) => (
                    <li key={l.href} className="border-t-2 border-fam-ink pt-5">
                      <Link href={l.href} className="group block">
                        <span className="fam-display-sm block text-[20px] leading-snug">
                          {l.label}
                        </span>
                        {l.detail ? (
                          <span className="mt-2 block text-[14px] leading-[1.6] text-fam-body">
                            {l.detail}
                          </span>
                        ) : null}
                        <span className="fam-underline mt-4 inline-block text-[13px] font-semibold text-fam-ink">
                          Open →
                        </span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </Section>
          );
        }

        case "stats": {
          const resolved = await resolveStats(
            (block.stats as { value?: string; label: string; source?: string }[]) ?? [],
          );
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <dl className="flex flex-wrap gap-x-14 gap-y-6">
                {resolved.map((st) => (
                  <div key={st.label}>
                    <dt className="fam-display text-[2.6rem] leading-none tabular-nums">
                      {st.value}
                    </dt>
                    <dd className="fam-meta mt-2 text-[10px] uppercase tracking-[0.14em] text-fam-muted">
                      {st.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          );
        }

        case "filmStrip": {
          const films = await loadFilms();
          const picked = ((block.films as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[];
          const drop = hiddenIds(block);
          /**
           * Page-owned rows win in EVERY layout, not just the accordion.
           *
           * `items` was read under `accordion` only, while the block ships
           * `list` — so a picture swapped on the page was written and then
           * thrown away at render. The hide list had the same fault: the ✕
           * on a film wrote to `hidden` and only the accordion ever read it.
           */
          const ownRows = (block.items as Record<string, unknown>[]) ?? [];
          const shown = ownRows.length
            ? await rowsToFilmRecords(ownRows)
            : (picked.length ? films.filter((f) => picked.includes(f.slug)) : films).filter(
                (f) => !drop.has(String(f.id)),
              );
          const awards = shown.reduce((sum, f) => sum + (f.awards ?? 0), 0);
          if (block.layout === "accordion") {
            const body = (
              <Section
                n={n}
                title={headingText}
                aside={introText}
                href={signedIn ? "/admin/collections/films/create" : undefined}
                hrefLabel={signedIn ? "Add a film" : undefined}
              >
                <FilmAccordion
                  films={ownRows.length ? await rowsToFilms(ownRows) : await accordionFilms(shown)}
                  signedIn={signedIn}
                  pageId={pageId}
                  blockIndex={i}
                />
              </Section>
            );
            return block.dark ? (
              <div key={key} className="z-band z-band--dark mt-16 sm:mt-24">{body}</div>
            ) : (
              <div key={key}>{body}</div>
            );
          }

          return (
            <Section
              key={key}
              n={n}
              title={headingText}
              aside={introText ?? `${shown.length} titles · ${awards} documentary awards`}
              /* Signed-in only: an "Add" control on a public press page would
                 advertise an admin route to every reader. Section renders the
                 link only when both props are present, so undefined is enough. */
              href={signedIn ? "/admin/collections/films/create" : undefined}
              hrefLabel={signedIn ? "Add a film" : undefined}
            >
              <FilmProfiles
                films={shown}
                layout={String(block.layout ?? "list")}
                showWatchLinks={block.showWatchLinks !== false}
                signedIn={signedIn}
              />
            </Section>
          );
        }

        case "peopleRow": {
          const picked = ((block.people as Rel[]) ?? []).map(relSlug).filter(Boolean) as string[];
          // An empty relationship means "the family", which is the common
          // case and saves an editor picking the same four every time.
          const ownRows = (block.cards as Record<string, unknown>[]) ?? [];
          const drop = hiddenIds(block);
          const shown = (
            picked.length
              ? (await loadPeople()).filter((p) => picked.includes(p.slug))
              : await loadFamily()
          ).filter((p) => !drop.has(String(p.id)));
          /* The card stack is two-column and holds its own heading on the
             left, so it is not wrapped in `Section` — a head above it would
             leave that column empty for the whole scroll. */
          if (block.layout === "stack") {
            const stack = (
              <PeopleStack
                heading={headingText}
                intro={introText}
                rail={block.rail as string | null}
                people={ownRows.length ? await rowsToRoster(ownRows) : await rosterPeople(shown)}
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={i}
              />
            );
            return block.dark ? (
              <section key={key} className="z-band z-band--dark mt-16 sm:mt-24">{stack}</section>
            ) : (
              <section key={key} className="z-band">{stack}</section>
            );
          }

          return (
            <Section
              key={key}
              n={n}
              title={headingText}
              aside={introText}
              href={signedIn ? "/admin/collections/people/create" : undefined}
              hrefLabel={signedIn ? "Add a person" : undefined}
            >
              {block.layout === "roster" ? (
                <PeopleRoster people={ownRows.length ? await rowsToRoster(ownRows) : await rosterPeople(shown)} />
              ) : (
              <PeopleProfiles
                /* Same rows the roster and stack layouts already honoured —
                   `portraits` is the default and was reading past them. */
                people={ownRows.length ? await rowsToPersonRecords(ownRows) : shown}
                layout={String(block.layout ?? "portraits")}
                showBios={block.showBios !== false}
                signedIn={signedIn}
              />
              )}
            </Section>
          );
        }

        case "magazineShelf": {
          const all = await loadEntries();
          const issues = all
            .filter((e) => e.kind === "magazine" && e.preview)
            .slice(0, Number(block.limit ?? 12));
          if (!issues.length) return null;
          return (
            <Section
              key={key}
              n={n}
              title={headingText}
              aside={block.aside ? String(block.aside) : introText}
            >
              <MagazineShelf issues={issues} />
            </Section>
          );
        }

        case "watchGrid": {
          const links = await loadWatchLinks();
          const free = links.filter((w) => w.free).length;
          return (
            <Section
              key={key}
              n={n}
              title={headingText}
              aside={introText ?? `${free} of ${links.length} are free to stream`}
            >
              <WatchGrid />
              {block.note ? (
                <p className="mt-14 max-w-2xl border-t border-fam-rule pt-6 text-[13px] leading-relaxed text-fam-muted">
                  {String(block.note)}
                </p>
              ) : null}
            </Section>
          );
        }

        case "pressList": {
          const appearances = await loadAppearances();
          /* `items` was honoured under `progression` only, while the block
             ships `log`. An outlet or a thumbnail corrected on the page was
             written and then ignored. */
          const ownRows = (block.items as Record<string, unknown>[]) ?? [];
          const base = ownRows.length ? rowsToAppearanceRecords(ownRows) : appearances;
          const limited = block.limit ? base.slice(0, Number(block.limit)) : base;
          if (block.layout === "progression") {
            const body = (
              <Section
                n={n}
                title={headingText}
                aside={introText}
                href={signedIn ? "/admin/collections/appearances/create" : undefined}
                hrefLabel={signedIn ? "Add an appearance" : undefined}
              >
                <PressProgression
                  items={ownRows.length ? rowsToProgression(ownRows) : progressionItems(limited as AppearanceRecord[])}
                />
              </Section>
            );
            return block.dark ? (
              <div key={key} className="z-band z-band--dark mt-16 sm:mt-24">{body}</div>
            ) : (
              <div key={key}>{body}</div>
            );
          }

          // Not wrapped in `Section`: the log brings its own two heads ("Most
          // watched", "The full log"), and nesting a numbered section around
          // them buries the actual content one level deeper than it reads.
          return (
            <div key={key} className="mx-auto max-w-[1320px] px-6 pt-16 sm:px-10 lg:px-12">
              {/* The press log brings its own headings rather than a Section,
                  so the "Add" control is placed here instead of via Section's
                  href. Signed-in only, same as every other editing affordance
                  on a public surface. */}
              {signedIn ? (
                <div className="mb-6 flex justify-end">
                  <Link
                    href="/admin/collections/appearances/create"
                    className="fam-meta inline-flex items-center gap-1 border border-fam-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-fam-ink transition-colors hover:bg-fam-ink hover:text-fam-paper print:hidden"
                  >
                    Add an appearance
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              ) : null}
              <PressLog
                appearances={limited as AppearanceRecord[]}
                featuredCount={Number(block.featuredCount ?? 3)}
                signedIn={signedIn}
              />
            </div>
          );
        }

        case "quote":
          return (
            <figure key={key} className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
              <blockquote className="fam-display border-l-2 border-fam-ink pl-6 text-[1.9rem] leading-[1.3] sm:pl-10">
                {String(block.quote ?? "")}
              </blockquote>
              {block.attribution || block.source ? (
                <figcaption className="fam-meta mt-5 pl-6 text-[11px] uppercase tracking-[0.12em] text-fam-muted sm:pl-10">
                  {block.attribution ? String(block.attribution) : null}
                  {block.source ? (
                    <>
                      {block.attribution ? " · " : null}
                      {block.sourceUrl ? (
                        <a
                          href={String(block.sourceUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fam-underline"
                        >
                          {String(block.source)}
                        </a>
                      ) : (
                        String(block.source)
                      )}
                    </>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          );

        /** Approved copy a booker or MC lifts straight off the page — the :30
         *  introduction in §8's success criteria. */
        case "copyBlock":
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <div className="max-w-3xl space-y-10">
                {((block.variants as { label: string; text: string }[]) ?? []).map((v) => (
                  <div key={v.label} className="border-l-2 border-fam-ink pl-6 sm:pl-10">
                    <p className="fam-eyebrow">{v.label}</p>
                    <p className="mt-4 whitespace-pre-wrap text-[16.5px] leading-[1.72] text-fam-body">
                      {v.text}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          );

        case "faq":
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <dl className="max-w-3xl divide-y divide-fam-rule border-y border-fam-rule">
                {((block.items as { question: string; answer: unknown }[]) ?? []).map((it) => (
                  <div key={it.question} className="py-6">
                    <dt className="fam-display-sm text-[18px] leading-snug">{it.question}</dt>
                    <dd className="mt-3 text-[15px] leading-[1.7] text-fam-body">
                      <RichTextBody value={it.answer} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          );

        case "cta":
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <div className="flex flex-wrap gap-3">
                {((block.actions as { label: string; href: string }[]) ?? []).map((a) => (
                  <Link key={a.href} href={a.href} className="fam-btn">
                    {a.label}
                  </Link>
                ))}
              </div>
              {block.note ? (
                <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-fam-muted">
                  {String(block.note)}
                </p>
              ) : null}
            </Section>
          );

        case "embed": {
          const aspect =
            block.aspect === "9-16"
              ? "aspect-[9/16] mx-auto max-w-sm"
              : block.aspect === "1-1"
                ? "aspect-square"
                : "aspect-video";
          return (
            <Section key={key} n={n} title={headingText} aside={introText}>
              <iframe
                src={String(block.url ?? "")}
                className={`w-full border border-fam-rule bg-fam-ink ${aspect}`}
                allowFullScreen
                title={headingText || "Embedded media"}
              />
            </Section>
          );
        }

        case "searchBar":
          return (
            <section key={key} className="border-y border-fam-rule bg-fam-paper">
              <div className="mx-auto max-w-[1320px] px-6 py-9 sm:px-10 sm:py-11 lg:px-12">
                <SearchBar
                  placeholder={String(block.placeholder ?? "Search the library")}
                />
              </div>
            </section>
          );

        case "columns":
          return (
            <div
              key={key}
              className="mx-auto grid max-w-[1320px] gap-x-14 gap-y-10 px-6 py-14 sm:px-10 md:grid-cols-2 lg:px-12"
            >
              {((block.columns as { content?: unknown; entries?: Rel[]; width?: string }[]) ?? []).map(
                (col, ci) => (
                  <div key={ci} className={col.width === "wide" ? "md:col-span-2" : ""}>
                    {col.content ? <RichTextBody value={col.content} /> : null}
                    {col.entries?.length ? (
                      <div className="mt-6">
                        <Cards
                          entries={
                            col.entries.filter(
                              (r) => r && typeof r === "object",
                            ) as unknown as Entry[]
                          }
                          layout="list"
                        />
                      </div>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          );

        case "divider": {
          const space =
            block.spacing === "small" ? "my-10" : block.spacing === "large" ? "my-28" : "my-20";
          return (
            <div key={key} className={`mx-auto max-w-[1320px] px-6 sm:px-10 lg:px-12 ${space}`}>
              <hr className="border-t border-fam-rule" />
            </div>
          );
        }

        default:
          // Unknown block: render nothing. A public page must not 500 because
          // the CMS is one deploy ahead of the renderer.
          return null;
      }
  };

  const rendered = await Promise.all(
    list.map(async (block, i) => {
      const node = await renderOne(block, i);
      if (!node) return null;
      // Signed out, BlockEdit is null and this is one extra div with no
      // class of consequence — no admin URL reaches a public visitor.
      if (!signedIn || pageId == null) return node;
      return (
        <div key={`edit-${block.blockType}-${i}`} className="fam-editable">
          {node}
          <BlockEdit signedIn={signedIn} pageId={pageId} blockType={String(block.blockType)} />
        </div>
      );
    }),
  );

  return <>{rendered}</>;
}

/**
 * Live figures, computed at request time.
 *
 * An editor picks a source per stat rather than typing a number, so "476
 * collections" cannot quietly become wrong the week after someone publishes
 * twelve more.
 */
async function resolveStats(
  stats: { value?: string; label: string; source?: string }[],
): Promise<{ value: string; label: string }[]> {
  if (!stats.length) return [];
  const needsLive = stats.some((s) => s.source && s.source !== "manual");
  if (!needsLive) {
    return stats.map((s) => ({ value: s.value ?? "", label: s.label }));
  }

  const all = await loadEntries();
  const films = await loadFilms();

  return stats.map((s) => {
    switch (s.source) {
      case "entryCount":
        return { value: all.length.toLocaleString("en-US"), label: s.label };
      case "filmCount":
        // Films that actually carry material. Counting rows instead said
        // "8 documentary films" while three of them had nothing behind them —
        // a number that overstates the archive.
        return {
          value: String(films.filter((f) => all.some((e) => e.film === f.title)).length),
          label: s.label,
        };
      case "filmRecordCount":
        return { value: String(films.length), label: s.label };
      case "eventCount":
        return {
          value: String(new Set(all.filter((e) => e.event).map((e) => e.event)).size),
          label: s.label,
        };
      case "awardTotal":
        return { value: String(films.reduce((n, f) => n + (f.awards ?? 0), 0)), label: s.label };
      case "fileCount":
        return {
          value: all.reduce((n, e) => n + (e.file_count ?? 0), 0).toLocaleString("en-US"),
          label: s.label,
        };
      default:
        return { value: s.value ?? "", label: s.label };
    }
  });
}

/**
 * Rich text, actually rendered.
 *
 * This was a hand-rolled tree walk that returned a flat string, so every link,
 * heading, list and bold run an editor wrote was silently discarded on the way
 * to the page. The official serialiser understands the node types Payload's
 * editor produces, including ones we have not enabled yet.
 */
function RichTextBody({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return null;
  return (
    <div className="fam-prose">
      <LexicalRichText data={value as SerializedEditorState} />
    </div>
  );
}

export { applyFacets };
