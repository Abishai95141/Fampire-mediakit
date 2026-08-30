import Link from "next/link";

import EntryCard from "@/components/fampire/EntryCard";
import SearchBar from "@/components/fampire/SearchBar";
import {
  applyFacets,
  BRAND_LABEL,
  facetCounts,
  sortEntries,
  suggestTerm,
  SORTS,
  facetsToQuery,
  SUBJECT_LABEL,
  visibleEntries,
  heldBackCount,
  type Entry,
  type Facets,
} from "@/lib/fampire/catalog";

/**
 * The faceted pool, as a component rather than a route.
 *
 * This used to be `app/(site)/library/page.tsx` — a hardcoded surface that no
 * one could edit. Lifting it here is what lets the Library be a BLOCK on a CMS
 * page: same markup, same facet maths, same URL contract, but the heading,
 * the page size, which rails show and any locked filters are now page content.
 *
 * The URL contract is the thing to preserve. Every filter state is a real URL,
 * server-rendered, so a filtered view can be pasted anywhere and it opens the
 * same way for the person who receives it. `basePath` exists so the same
 * browser can live at `/library` and on a world's own page without either one
 * writing links that navigate away from itself.
 *
 * Locked filters are applied but never rendered as removable chips — a world
 * page must not offer "clear all" and dump the reader into the whole catalog.
 */

type Axis = { key: keyof Facets; label: string; format?: (v: string) => string };

const AXES: Axis[] = [
  {
    /**
     * First, because "video or photos?" is the first thing anyone asks and
     * `kind` does not answer it — "event photography" and "b-roll" describe
     * the shoot, and either can hand you a folder full of the other thing.
     */
    key: "media",
    label: "Photos or video",
    format: (v) =>
      ({
        image: "Photos",
        video: "Video",
        document: "Documents",
        audio: "Audio",
        vector: "Logos & graphics",
        other: "Other files",
      })[v] ?? v,
  },
  { key: "kind", label: "Kind" },
  {
    key: "orientation",
    label: "Orientation",
    // "Vertical" is what an editor cutting for social actually says.
    format: (v) =>
      ({ portrait: "Vertical", landscape: "Horizontal", square: "Square", mixed: "Mixed" })[v] ?? v,
  },
  { key: "occasion", label: "Occasion", format: (v) => v.replace(/-/g, " ") },
  {
    // The brands are a way of looking at one library, not eight libraries.
    // They were a URL segment briefly, which split the catalog into separate
    // sites and left no single place to search everything.
    key: "brand",
    label: "Brand",
    format: (v) => BRAND_LABEL[v] ?? v.replace(/-/g, " "),
  },
  { key: "subject", label: "Person", format: (v) => SUBJECT_LABEL[v] ?? v },
  // Guest people: 321 entries carry one and no control reached them.
  { key: "person", label: "Featuring" },
  { key: "location", label: "Place" },
  { key: "issue", label: "Magazine issue", format: (v) => `Issue #${v}` },
  { key: "year", label: "Year" },
  { key: "film", label: "Film" },
  { key: "event", label: "Event" },
];

export type LockedFilters = {
  brand?: string;
  kind?: string[];
  orientation?: string[];
};

export default async function LibraryBrowser({
  facets,
  signedIn,
  basePath = "/library",
  heading,
  intro,
  perPage = 60,
  showFacets = true,
  showSearch = true,
  showSort = true,
  showCount = true,
  locked,
}: {
  facets: Facets;
  signedIn: boolean;
  basePath?: string;
  heading?: string;
  intro?: string;
  perPage?: number;
  showFacets?: boolean;
  showSearch?: boolean;
  showSort?: boolean;
  showCount?: boolean;
  locked?: LockedFilters;
}) {
  const requestedPage = Math.max(1, Number(facets.page ?? 1) || 1);
  const size = perPage > 0 ? perPage : 60;

  // Decides which rows are listed as openable. Nothing sensitive is served
  // here — private entries render as a locked card carrying only a title and a
  // description, never a URL.
  const all = await visibleEntries(signedIn);
  // Counted, not assumed — see heldBackCount.
  const held = signedIn ? 0 : await heldBackCount();
  const pool = applyLocked(all, locked);

  const results = sortEntries(applyFacets(pool, facets), facets.sort, facets.q);
  /**
   * Paginated.
   *
   * The page once shipped all 476 cards in a single 1.37 MB response and the
   * read layer capped at 2,000 entries with no pagination — silent truncation
   * was the real scaling wall, well before anything algorithmic.
   */
  const totalPages = Math.max(1, Math.ceil(results.length / size));
  /**
   * Clamped to the last page that exists.
   *
   * An out-of-range page renders an empty grid while the header and every
   * facet still report the true count — which reads as "the search returned
   * nothing" even though it matched. The search box no longer carries a stale
   * page forward, but a pasted or bookmarked URL still can, and a shared link
   * that silently shows nothing is the same failure with a longer fuse.
   */
  const page = Math.min(requestedPage, totalPages);
  const shown = results.slice((page - 1) * size, page * size);
  // A near-miss should land somewhere, not on an empty page.
  const suggestion = results.length === 0 && facets.q ? suggestTerm(pool, facets.q) : null;
  // `page` and `sort` are controls, not filters — they must not render as
  // removable filter chips.
  const active = Object.entries(facets).filter(
    ([k, v]) => v && k !== "page" && k !== "sort",
  ) as [keyof Facets, string][];

  const href = (f: Facets) => `${basePath}${facetsToQuery(f)}`;

  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-32 pt-12 sm:px-10 sm:pt-16 lg:px-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="fam-display text-[3rem] leading-[1.06] sm:text-[4.5rem]">
          {heading ?? "The Library"}
        </h1>
        {showCount ? (
          <p className="text-[13px] font-semibold tabular-nums text-fam-muted">
            {results.length} of {pool.length} collections
            {signedIn ? null : " · public view"}
          </p>
        ) : null}
      </div>

      {intro ? (
        <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.65] text-fam-body">{intro}</p>
      ) : null}

      {showSearch ? (
        <div className="mt-10">
          <SearchBar live placeholder="Search — a person, a film, an event, a year" />
        </div>
      ) : null}

      {/* Sorting was hardcoded to largest-first, so the best match for a query
          could sit four hundred cards down. */}
      {showSort ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="fam-eyebrow mr-1">Sort</span>
          {(Object.entries(SORTS) as [string, string][]).map(([value, label]) => {
            const on = (facets.sort ?? (facets.q ? "relevance" : "largest")) === value;
            return (
              <Link
                key={value}
                href={href({ ...facets, sort: value, page: undefined })}
                aria-current={on ? "true" : undefined}
                className={`fam-meta border px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] ${
                  on
                    ? "border-fam-ink bg-fam-ink text-white"
                    : "border-fam-rule text-fam-muted hover:border-fam-ink hover:text-fam-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {active.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <span className="fam-eyebrow mr-1">Filtered by</span>
          {active.map(([k, v]) => (
            <Link
              key={k}
              href={href({ ...facets, [k]: undefined })}
              className="group inline-flex items-center gap-2 border border-fam-ink bg-fam-ink px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white hover:text-fam-ink"
            >
              {k === "subject" ? SUBJECT_LABEL[v] ?? v : v}
              <span aria-hidden className="text-white/60 group-hover:text-fam-ink/50">
                ×
              </span>
            </Link>
          ))}
          <Link
            href={basePath}
            className="fam-underline ml-1 text-[12px] font-semibold text-fam-muted hover:text-fam-ink"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <div
        className={`mt-12 grid gap-x-14 ${
          showFacets ? "lg:grid-cols-[minmax(0,13.5rem)_1fr]" : ""
        }`}
      >
        {/* Facets. Counts are computed against every OTHER active facet, so a
            value showing "6" always yields 6, and options that would yield
            nothing are simply not offered. */}
        {showFacets ? (
          /**
           * A drawer on small screens, a rail on large ones.
           *
           * Every axis rendered at full length on mobile — Kind, Orientation,
           * Occasion, Brand, Person, Featuring, Place, Issue, Year, Film,
           * Event — so a phone visitor scrolled past roughly two hundred
           * filter rows before reaching a single collection.
           *
           * THIS WAS A `<details>` AND THE RAIL WAS INVISIBLE ON DESKTOP.
           * The element was never given `open`; a media query instead set
           * `display: block !important` on its child and trusted that to
           * reveal it. It does not. A closed `<details>` hides its content
           * through the UA stylesheet no matter what `display` the child is
           * given, so the panel measured 216×0 at 1440px wide with all twelve
           * axes present in the DOM and none of them on screen — the whole
           * filter rail, silently absent, while the markup looked correct.
           *
           * A checkbox and a label do the same job with no such trapdoor:
           * hidden until checked below `lg`, unconditionally shown from `lg`
           * up. Still no JavaScript, and nothing to force open.
           */
          <div className="fam-facets group mb-8 lg:mb-0 lg:sticky lg:top-24 lg:self-start">
            <input type="checkbox" id="fam-facets-toggle" className="peer sr-only" />
            <label
              htmlFor="fam-facets-toggle"
              className="fam-meta mb-4 flex cursor-pointer list-none items-center justify-between border-y border-fam-rule py-3 text-[11px] uppercase tracking-[0.14em] text-fam-ink lg:hidden"
            >
              Filters
              <span aria-hidden className="text-[14px] transition-transform peer-checked:rotate-45">+</span>
            </label>
          <div className="hidden peer-checked:block lg:block lg:sticky lg:top-24 lg:self-start">
            {/* A nested scroller inside a Lenis page is the classic "some of it
                scrolls at a different speed" bug: the rail scrolls natively while
                the page scrolls smoothed, and once the rail hits its end the
                wheel chains to the page mid-gesture. `data-lenis-prevent` hands
                this element to the browser and contains its overscroll. */}
            <div
              data-lenis-prevent
              className="space-y-8 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2"
            >
              {AXES.map((axis) => {
                // A locked axis is not a choice, so it is not offered.
                if (locked?.brand && axis.key === "brand") return null;
                if (locked?.kind?.length && axis.key === "kind") return null;
                if (locked?.orientation?.length && axis.key === "orientation") return null;

                const counts = facetCounts(pool, facets, axis.key);
                if (!counts.length) return null;
                return (
                  <div key={axis.key}>
                    <p className="fam-eyebrow border-t-2 border-fam-ink pt-3">{axis.label}</p>
                    <ul className="mt-3 space-y-1.5">
                      {counts.map(([value, n]) => {
                        const isOn = facets[axis.key] === value;
                        return (
                          <li key={value}>
                            <Link
                              href={href({
                                ...facets,
                                [axis.key]: isOn ? undefined : value,
                                page: undefined,
                              })}
                              className={`flex items-baseline justify-between gap-3 text-[13.5px] leading-snug transition-colors ${
                                isOn
                                  ? "font-semibold text-fam-ink"
                                  : "text-fam-body hover:text-fam-ink"
                              }`}
                            >
                              <span className={isOn ? "border-b border-fam-ink" : ""}>
                                {axis.format ? axis.format(value) : value}
                              </span>
                              <span className="shrink-0 tabular-nums text-fam-faint">{n}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        ) : null}

        <section className={showFacets ? "mt-12 lg:mt-0" : ""}>
          {results.length === 0 ? (
            <div className="border-t border-fam-rule py-16">
              <p className="fam-display text-3xl">Nothing matches that.</p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-fam-body">
                The catalog is a few hundred described collections, not a file
                browser — try a person, a film title, an event or a year.
              </p>
              {suggestion ? (
                <p className="mt-5 text-[15px] text-fam-body">
                  Did you mean{" "}
                  <Link
                    href={href({ ...facets, q: suggestion, page: undefined })}
                    className="fam-underline font-semibold text-fam-ink"
                  >
                    {suggestion}
                  </Link>
                  ?
                </p>
              ) : null}
              <Link
                href={basePath}
                className="fam-underline mt-6 inline-block text-[14px] font-semibold text-fam-ink"
              >
                Clear the filters →
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((e) => (
                  <li key={e.id}>
                    <EntryCard entry={e} signedIn={signedIn} />
                  </li>
                ))}
              </ul>
              <div className="border-t border-fam-rule" />
              {!signedIn && held > 0 ? (
                <p className="mt-8 max-w-xl text-[13px] leading-relaxed text-fam-muted">
                  {held} collection{held === 1 ? " is" : "s are"} held back —
                  password-gated at source, or awaiting written sign-off before
                  they publish.{" "}
                  <Link
                    href={`/login?next=${encodeURIComponent(basePath)}`}
                    className="fam-underline font-semibold text-fam-ink"
                  >
                    Sign in
                  </Link>{" "}
                  to see them listed.
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-fam-rule pt-6"
        >
          <p className="fam-meta text-[11px] uppercase tracking-[0.12em] text-fam-muted">
            Page {page} of {totalPages} · {results.length} collections
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={href({ ...facets, page: String(page - 1) })}
                className="fam-meta border border-fam-rule px-4 py-2 text-[11px] uppercase tracking-[0.1em] hover:border-fam-ink"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={href({ ...facets, page: String(page + 1) })}
                className="fam-meta border border-fam-ink bg-fam-ink px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-white"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

/**
 * Locked filters narrow the pool before the reader's own facets run.
 *
 * Applied to the POOL rather than merged into `facets` on purpose: facet
 * counts and the "filtered by" chips both read from the pool, so a locked
 * brand shapes the counts without ever appearing as something to remove.
 */
function applyLocked(entries: Entry[], locked?: LockedFilters): Entry[] {
  if (!locked) return entries;
  let pool = entries;
  // `brands` is a list — an entry can belong to more than one world.
  if (locked.brand) pool = pool.filter((e) => e.brands.includes(locked.brand!));
  if (locked.kind?.length) pool = pool.filter((e) => locked.kind!.includes(e.kind));
  if (locked.orientation?.length) {
    pool = pool.filter((e) => e.orientation && locked.orientation!.includes(e.orientation));
  }
  return pool;
}
