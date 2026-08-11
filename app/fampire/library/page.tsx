import type { Metadata } from "next";
import Link from "next/link";
import EntryCard from "@/components/fampire/EntryCard";
import SearchBar from "@/components/fampire/SearchBar";
import { isSignedIn } from "@/lib/fampire/auth";
import {
  applyFacets,
  facetCounts,
  facetsFromParams,
  facetsToQuery,
  SUBJECT_LABEL,
  visibleEntries,
  type Facets,
} from "@/lib/fampire/catalog";

/**
 * The Library — the flat faceted pool.
 *
 * Sections elsewhere are lenses onto these same records; nothing is duplicated.
 * Two axes filter simultaneously (subject × kind) plus year, brand, film and
 * event, and every filter state is a real URL: the page is a server component
 * reading searchParams, so a filtered view can be pasted anywhere, opens
 * server-rendered, and unfurls with a title.
 */

export const metadata: Metadata = {
  title: "The Library",
  description:
    "Every collection in the FAMPIRE Media Center, filterable by person, kind, year, film and event.",
};

type Axis = { key: keyof Facets; label: string; format?: (v: string) => string };

const AXES: Axis[] = [
  { key: "kind", label: "Kind" },
  { key: "subject", label: "Person", format: (v) => SUBJECT_LABEL[v] ?? v },
  { key: "year", label: "Year" },
  { key: "film", label: "Film" },
  { key: "event", label: "Event" },
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const facets = facetsFromParams(params);

  // Decides which rows are listed as openable. Nothing sensitive is served
  // from this page — private entries render as a locked card carrying only a
  // title and a description, never a URL.
  const signedIn = await isSignedIn();

  const pool = visibleEntries(signedIn);
  const results = applyFacets(pool, facets);
  const active = Object.entries(facets).filter(([, v]) => v) as [keyof Facets, string][];

  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-32 pt-12 sm:px-10 sm:pt-16 lg:px-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="fam-display text-[3rem] leading-[1.06] sm:text-[4.5rem]">
          The Library
        </h1>
        <p className="text-[13px] font-semibold tabular-nums text-fam-muted">
          {results.length} of {pool.length} collections
          {signedIn ? null : " · public view"}
        </p>
      </div>

      <div className="mt-10">
        <SearchBar live placeholder="Search — a person, a film, an event, a year" />
      </div>

      {active.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <span className="fam-eyebrow mr-1">Filtered by</span>
          {active.map(([k, v]) => (
            <Link
              key={k}
              href={`/fampire/library${facetsToQuery({ ...facets, [k]: undefined })}`}
              className="group inline-flex items-center gap-2 border border-fam-ink bg-fam-ink px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white hover:text-fam-ink"
            >
              {k === "subject" ? SUBJECT_LABEL[v] ?? v : v}
              <span aria-hidden className="text-white/60 group-hover:text-fam-ink/50">
                ×
              </span>
            </Link>
          ))}
          <Link
            href="/fampire/library"
            className="fam-underline ml-1 text-[12px] font-semibold text-fam-muted hover:text-fam-ink"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <div className="mt-12 grid gap-x-14 lg:grid-cols-[minmax(0,13.5rem)_1fr]">
        {/* Facets. Counts are computed against every OTHER active facet, so a
            value showing "6" always yields 6, and options that would yield
            nothing are simply not offered. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
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
              const counts = facetCounts(pool, facets, axis.key);
              if (!counts.length) return null;
              return (
                <div key={axis.key}>
                  <p className="fam-eyebrow border-t-2 border-fam-ink pt-3">{axis.label}</p>
                  <ul className="mt-3 space-y-1.5">
                    {counts.map(([value, n]) => {
                      const isOn = facets[axis.key] === value;
                      const href = `/fampire/library${facetsToQuery({
                        ...facets,
                        [axis.key]: isOn ? undefined : value,
                      })}`;
                      return (
                        <li key={value}>
                          <Link
                            href={href}
                            className={`flex items-baseline justify-between gap-3 text-[13.5px] leading-snug transition-colors ${
                              isOn
                                ? "font-semibold text-fam-ink"
                                : "text-fam-body hover:text-fam-ink"
                            }`}
                          >
                            <span className={isOn ? "border-b border-fam-ink" : ""}>
                              {axis.format ? axis.format(value) : value}
                            </span>
                            <span className="shrink-0 tabular-nums text-fam-faint">
                              {n}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="mt-12 lg:mt-0">
          {results.length === 0 ? (
            <div className="border-t border-fam-rule py-16">
              <p className="fam-display text-3xl">Nothing matches that.</p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-fam-body">
                The catalog is a few hundred described collections, not a file
                browser — try a person, a film title, an event or a year.
              </p>
              <Link
                href="/fampire/library"
                className="fam-underline mt-6 inline-block text-[14px] font-semibold text-fam-ink"
              >
                Clear the filters →
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((e) => (
                  <li key={e.id}>
                    <EntryCard entry={e} signedIn={signedIn} />
                  </li>
                ))}
              </ul>
              <div className="border-t border-fam-rule" />
              {!signedIn ? (
                <p className="mt-8 max-w-xl text-[13px] leading-relaxed text-fam-muted">
                  Some collections are held back — password-gated at source, or
                  awaiting written sign-off before they publish.{" "}
                  <Link
                    href="/fampire/login?next=/fampire/library"
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
    </div>
  );
}
