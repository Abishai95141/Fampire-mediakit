import Link from "next/link";

import ItemControls from "@/components/fampire/ItemControls";

import { ImageWell } from "@/components/fampire/Preview";

import {
  loadEntries,
  loadFilms,
  loadWatchLinks,
  previewForFilm,
  previewsForSubjects,
  SUBJECT_LABEL,
  type Entry,
  type FilmRecord,
  type PersonRecord,
} from "@/lib/fampire/catalog";

/**
 * The narrative surfaces, as blocks.
 *
 * Each of these was a hardcoded route file. The markup is carried over
 * unchanged — the point of the move is not a redesign, it is that the film
 * slate, the family profiles, the press log and the magazine shelf are now
 * things an editor places on a page, in whatever order the page needs, rather
 * than fixed furniture that only a developer can reorder.
 *
 * They all read live from the catalog, so §4.5 rule 3 still holds: a narrative
 * section embeds real records and cannot drift out of date relative to them.
 */

/**
 * "Edit this" on an individual item, for a signed-in editor.
 *
 * Collections have had one of these on every card for a while; press
 * appearances and people profiles did not, so the only route to a single
 * podcast was to know it lived under Stories → Appearances and find it by
 * name. Reported as: each item should have its own edit button.
 *
 * ALWAYS rendered as a sibling of the item's own <a>, never inside it. An
 * anchor nested in an anchor is invalid HTML and the browser silently drops
 * one of them — which here would break either the edit link or the link to
 * the podcast itself, with nothing in the console to say why.
 *
 * Renders nothing at all when signed out: public press surfaces stay
 * completely ungated, so this must not exist in the markup for a reader.
 */
function EditPill({
  href,
  label = "Edit",
  signedIn,
}: {
  href: string;
  label?: string;
  signedIn?: boolean;
}) {
  if (!signedIn) return null;
  return (
    <Link
      href={href}
      className="fam-meta mt-2 inline-flex items-center gap-1 border border-fam-rule px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-fam-muted transition-colors hover:border-fam-ink hover:text-fam-ink print:hidden"
    >
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}

const fmt = new Intl.NumberFormat("en-US");

/**
 * A hand-set image wins over one borrowed from the catalog.
 *
 * Borrowing is a good default and a bad guarantee: a film with no indexed
 * collections, or a person whose collections are all held for review, ends up
 * with nothing to show and no way to fix it from the CMS.
 */
const chosen = (url?: string | null, upload?: { url?: string } | string | null): string | null => {
  if (typeof url === "string" && url.trim()) return url.trim();
  if (upload && typeof upload === "object" && upload.url) return upload.url;
  return null;
};

// ── Films ───────────────────────────────────────────────────────────────

export async function FilmProfiles({
  films,
  layout = "list",
  showWatchLinks = true,
  signedIn = false,
  pageId,
  blockIndex,
  blockId,
}: {
  films: FilmRecord[];
  layout?: string;
  showWatchLinks?: boolean;
  signedIn?: boolean;
  /**
   * Where this section lives, so a card can be edited or taken off the page.
   *
   * These layouts had no per-item controls at all, which meant the one page
   * in the product that is ABOUT the films offered no way to reorder them,
   * swap one out or drop one — the accordion layout had the controls and the
   * three layouts actually in use did not.
   */
  pageId?: number | string;
  blockIndex?: number;
  blockId?: string | null;
}) {
  const entries = await loadEntries();
  const watchLinks = await loadWatchLinks();

  if (layout === "grid") {
    return (
      <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {films.map((f) => {
          const art = previewForFilm(entries, f.title);
          const src = chosen(f.posterUrl, f.posterImage) ?? art?.image ?? null;
          return (
            <li key={f.slug} className="fam-item relative">
              <ItemControls
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={blockIndex}
                blockId={blockId}
                collection="films"
                id={f.id ?? null}
                label={f.title}
              />
              <Link href={`/library?film=${encodeURIComponent(f.title)}`} className="group block">
                <ImageWell
                  src={src}
                  alt={f.title}
                  label={f.title}
                  shape="tall"
                  width={700}
                />
                <h3 className="fam-display-sm mt-4 text-[19px] leading-snug">{f.title}</h3>
                {f.note ? <p className="mt-1.5 text-[14px] text-fam-muted">{f.note}</p> : null}
                <p className="mt-1 text-[13px] font-semibold tabular-nums text-fam-ink">
                  {(f.awards ?? 0) > 0 ? `${f.awards} awards` : "In production"} · {f.year}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  if (layout === "profiles") {
    return (
      <div className="space-y-20 sm:space-y-28">
        {films.map((f) => {
          const assets = entries.filter((e) => e.film === f.title);
          const watch = watchLinks.filter((w) => w.film === f.title);
          const hero = previewForFilm(entries, f.title);
          const heroSrc = chosen(f.posterUrl, f.posterImage) ?? hero?.image ?? null;

          return (
            <article key={f.slug} className="fam-item fam-section-rule relative pt-10">
              <ItemControls
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={blockIndex}
                blockId={blockId}
                collection="films"
                id={f.id ?? null}
                label={f.title}
              />
              <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <h2 className="fam-display text-[2.6rem] leading-[1.06] sm:text-[3.4rem]">
                      {f.title}
                    </h2>
                    <span className="fam-eyebrow-muted">
                      {f.year} ·{" "}
                      {(f.awards ?? 0) > 0 ? `${f.awards} awards` : "In production"}
                    </span>
                  </div>

                  {/* Synopses live in Who & What → Films now. They were a
                      hardcoded map keyed by title, which meant editing one
                      needed a developer and a rename silently blanked it. */}
                  {f.synopsis ? (
                    <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.7] text-fam-body">
                      {f.synopsis}
                    </p>
                  ) : null}

                  <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                    {/* A link promising nothing is worse than a sentence.
                        Three films have no indexed collections yet, and
                        "0 collections →" invited a click into an empty page. */}
                    {assets.length > 0 ? (
                      <Link
                        href={`/library?film=${encodeURIComponent(f.title)}`}
                        className="fam-underline text-[14px] font-semibold text-fam-ink"
                      >
                        {assets.length} collection{assets.length === 1 ? "" : "s"} →
                      </Link>
                    ) : (
                      <span className="text-[14px] text-fam-muted">
                        No collections indexed yet
                      </span>
                    )}
                    {showWatchLinks && watch.length > 0 ? (
                      <span className="text-[14px] text-fam-muted">
                        Watch on{" "}
                        {watch.map((w, i) => (
                          <span key={w.url}>
                            {i > 0 ? ", " : ""}
                            <a
                              href={w.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="fam-underline font-medium text-fam-body hover:text-fam-ink"
                            >
                              {w.platform}
                            </a>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  {f.id ? (
                    <EditPill
                      href={`/admin/collections/films/${f.id}`}
                      label="Edit this film"
                      signedIn={signedIn}
                    />
                  ) : null}
                </div>

                <ImageWell
                  src={heroSrc}
                  alt={hero?.title ?? f.title}
                  label={f.title}
                  shape="wide"
                  width={880}
                />
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  // Compact list.
  return (
    <ul className="divide-y divide-fam-rule border-y border-fam-rule">
      {films.map((f) => (
        <li key={f.slug} className="flex flex-wrap items-baseline justify-between gap-4 py-5">
          <Link
            href={`/library?film=${encodeURIComponent(f.title)}`}
            className="fam-display text-[1.4rem]"
          >
            {f.title}
          </Link>
          <span className="fam-meta text-[10px] uppercase tracking-[0.14em] text-fam-muted">
            {f.year ?? ""}
            {f.awards ? ` · ${f.awards} awards` : ""}
            {f.note ? ` · ${f.note}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── People ──────────────────────────────────────────────────────────────

export async function PeopleProfiles({
  people,
  layout = "portraits",
  showBios = true,
  signedIn = false,
  pageId,
  blockIndex,
  blockId,
}: {
  people: PersonRecord[];
  layout?: string;
  showBios?: boolean;
  signedIn?: boolean;
  /** Where this section lives, so a card can be edited or taken off the page.
   *  The roster and stack layouts already had these controls; `portraits` and
   *  `profiles` — the two actually in use — had none. */
  pageId?: number | string;
  blockIndex?: number;
  blockId?: string | null;
}) {
  const publicEntries = await loadEntries();
  const shots = previewsForSubjects(publicEntries, people.map((p) => p.slug));

  if (layout === "names") {
    return (
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((p) => (
          <li key={p.slug} className="fam-item relative">
            <ItemControls
              signedIn={signedIn}
              pageId={pageId}
              blockIndex={blockIndex}
              blockId={blockId}
              collection="people"
              id={p.id ?? null}
              label={p.name}
            />
            <Link href={`/library?subject=${p.slug}`} className="fam-display text-[1.2rem]">
              {p.name}
            </Link>
            {p.role ? (
              <p className="fam-meta mt-1 text-[10px] uppercase tracking-[0.14em] text-fam-muted">
                {p.role}
              </p>
            ) : null}
            {showBios && p.bio ? (
              <p className="mt-3 text-[13.5px] leading-[1.6] text-fam-body">{p.bio}</p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "profiles") {
    /**
     * Held-for-review counts, so a child's row can tell the truth.
     *
     * Love and Legend render "0 collections" to the public, which reads as "we
     * have nothing of them". What is actually true is that every collection
     * featuring them is flagged and waiting on an approver (§9.1) — the gate
     * working, not an empty archive. Saying so is more honest than a zero.
     */
    /**
     * "Awaiting review" must mean awaiting review — nothing else.
     *
     * This counted every unpublished entry, which was right only while the
     * child-safety holds were the only drafts. They have been reviewed and
     * released, and what remains unpublished is rejected material: Lightroom
     * sidecars, `.fcpbundle` project files, `XDROOT` camera directories and
     * merged duplicates. Counting those made TereZa's row read "13 more
     * awaiting review" when nothing was queued and nothing ever would be —
     * a promise of material that does not exist.
     */
    const held = await loadEntries({ includeDrafts: true });
    return (
      <div className="space-y-16">
        {people.map((p) => {
          const collections = publicEntries.filter((e) => e.subjects.includes(p.slug));
          const awaiting = held.filter(
            (e) =>
              e.subjects.includes(p.slug) &&
              e.visibility !== "public" &&
              // Held BY the safety gate specifically, not merely unpublished.
              e.contains_minor &&
              !e.contains_minor_confirmed,
          ).length;

          return (
            <article
              key={p.slug}
              className="fam-item fam-section-rule relative grid gap-x-14 gap-y-7 pt-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,20rem)_1fr]"
            >
              <ItemControls
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={blockIndex}
                blockId={blockId}
                collection="people"
                id={p.id ?? null}
                label={p.name}
              />
              <ImageWell
                src={chosen(p.portraitUrl, p.portraitImage) ?? shots[p.slug] ?? null}
                alt={SUBJECT_LABEL[p.slug] ?? p.name}
                label={SUBJECT_LABEL[p.slug] ?? p.name}
                shape="tall"
                width={700}
              />
              <div>
                <h2 className="fam-display text-[2.4rem] leading-[1.06]">
                  {SUBJECT_LABEL[p.slug] ?? p.name}
                </h2>
                {p.role ? <p className="fam-eyebrow-muted mt-3">{p.role}</p> : null}
                <Link
                  href={`/library?subject=${p.slug}`}
                  className="fam-underline mt-5 inline-block text-[14px] font-semibold text-fam-ink"
                >
                  {collections.length} collection{collections.length === 1 ? "" : "s"} →
                </Link>
                {awaiting > 0 ? (
                  <p className="fam-meta mt-2 text-[10px] uppercase tracking-[0.12em] text-fam-muted">
                    {awaiting} more awaiting review
                  </p>
                ) : null}
                {p.id ? (
                  <div>
                    <EditPill
                      href={`/admin/collections/people/${p.id}`}
                      label="Edit this person"
                      signedIn={signedIn}
                    />
                  </div>
                ) : null}
              </div>
              <div className="max-w-2xl">
                {p.bio ? (
                  <p className="text-[16.5px] leading-[1.72] text-fam-body">{p.bio}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  // Portrait grid.
  return (
    <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      {people.map((p) => (
        <li key={p.slug} className="fam-item relative">
          <ItemControls
            signedIn={signedIn}
            pageId={pageId}
            blockIndex={blockIndex}
            blockId={blockId}
            collection="people"
            id={p.id ?? null}
            label={p.name}
          />
          <Link href={`/library?subject=${p.slug}`} className="group block">
            <ImageWell
              src={chosen(p.portraitUrl, p.portraitImage) ?? shots[p.slug] ?? null}
              alt={SUBJECT_LABEL[p.slug] ?? p.name}
              label={SUBJECT_LABEL[p.slug] ?? p.name}
              shape="tall"
              width={700}
            />
            <h3 className="fam-display-sm mt-4 text-[19px] leading-snug">
              {SUBJECT_LABEL[p.slug] ?? p.name}
            </h3>
            {p.role ? <p className="fam-eyebrow-muted mt-1.5">{p.role}</p> : null}
            {showBios && p.bio ? (
              <p className="mt-3 text-[14px] leading-[1.65] text-fam-body">{p.bio}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ── The magazine ────────────────────────────────────────────────────────

export function MagazineShelf({ issues }: { issues: Entry[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {issues.map((m) => (
        <li key={m.id} className="border-t border-fam-rule pt-6">
          <h3 className="fam-display-sm text-[18px] leading-snug">
            {m.title.replace("Biohack Yourself Magazine — ", "")}
          </h3>
          {m.description ? (
            <p className="mt-2 text-[14px] leading-relaxed text-fam-body">{m.description}</p>
          ) : null}
          <div className="mt-4 flex gap-5">
            {m.preview ? (
              <a
                href={m.preview}
                target="_blank"
                rel="noopener noreferrer"
                className="fam-underline text-[13px] font-semibold text-fam-ink"
              >
                Read the issue ↗
              </a>
            ) : null}
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="fam-underline text-[13px] text-fam-muted hover:text-fam-ink"
            >
              Assets ↗
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Where to watch ──────────────────────────────────────────────────────

export async function WatchGrid({
  rows,
}: {
  /** Rows the page owns. Undefined means "show every film that has a link",
   *  which is what this block did before it could be curated at all. */
  rows?: { title: string; links: { platform: string; url: string; free?: boolean }[] }[];
} = {}) {
  const films = await loadFilms();
  const links = await loadWatchLinks();

  const matrix = rows?.length
    ? rows.filter((r) => r.links.length)
    : films
        .map((f) => ({ title: f.title, links: links.filter((w) => w.film === f.title) }))
        .filter((r) => r.links.length);

  return (
    <div className="grid gap-x-14 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {matrix.map((f) => {
        const forFilm = f.links;
        return (
          <div key={f.title} className="border-t border-fam-rule pt-5">
            <h3 className="fam-display-sm text-[17px]">{f.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {forFilm.map((w) => (
                <li key={w.url}>
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fam-underline text-[13px] font-medium text-fam-body hover:text-fam-ink"
                  >
                    {w.platform}
                    {w.free ? <span className="text-fam-faint"> · free</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ── Press ───────────────────────────────────────────────────────────────

export type AppearanceRecord = {
  /**
   * The database row id, for the per-item edit link.
   *
   * Deliberately the row id and not a slug: this addresses the admin, which
   * routes by id. It is optional because the type predates the field and a
   * record without one simply renders no edit affordance rather than an
   * "/undefined" link.
   */
  record_id?: number | string | null;
  title: string;
  url?: string | null;
  outlet?: string | null;
  aired?: string | null;
  views?: number | null;
  thumbnail?: string | null;
  parts?: { label: string; url: string }[] | null;
};

export function PressLog({
  appearances,
  featuredCount = 3,
  signedIn = false,
  pageId,
  blockIndex,
  blockId,
}: {
  appearances: AppearanceRecord[];
  featuredCount?: number;
  signedIn?: boolean;
  /** Where this section lives. The log offered an "Edit this appearance"
   *  pill, which opens the RECORD and changes it everywhere; it had no way to
   *  reorder the log or drop one entry from this page. */
  pageId?: number | string;
  blockIndex?: number;
  blockId?: string | null;
}) {
  /**
   * The full log renders in the order it is GIVEN.
   *
   * It used to re-sort by date here, which silently defeated the whole point
   * of drag-to-reorder: an editor could rearrange Appearances in the admin,
   * the query would return them in that order, and this line would throw it
   * away and re-sort by date before painting. The order now comes from
   * `loadAppearances`, which sorts on the editor's `_order` key.
   *
   * "Most watched" below is deliberately still sorted by view count — that
   * is a stated editorial rule ("the 506,000-view one leads"), not an
   * accident of ordering.
   */
  const sorted = appearances;

  /** The most-watched appearances lead the page — a booker scanning for reach
   *  should not have to read 57 rows to find the 506,000-view one. */
  const featured =
    featuredCount > 0
      ? [...appearances]
          .filter((a) => a.views && a.thumbnail)
          .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
          .slice(0, featuredCount)
      : [];
  const featuredUrls = new Set(featured.map((a) => a.url));

  return (
    <>
      {featured.length > 0 ? (
        <section className="fam-section-rule pt-6">
          <h2 className="fam-eyebrow">Most watched</h2>
          <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-3">
            {featured.map((a) => (
              <li key={a.url ?? a.title} className="fam-item relative">
                <ItemControls
                  signedIn={signedIn}
                  pageId={pageId}
                  blockIndex={blockIndex}
                  blockId={blockId}
                  collection="appearances"
                  id={a.record_id ?? null}
                  label={a.title}
                />
                <a
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <ImageWell
                    src={a.thumbnail ?? null}
                    alt={a.title}
                    label={a.title}
                    shape="cinema"
                    width={800}
                  />
                  <p className="fam-eyebrow-muted mt-4">
                    {a.aired} · {fmt.format(a.views ?? 0)} views
                  </p>
                  <h3 className="fam-display-sm mt-2 text-[18px] leading-snug">{a.title}</h3>
                  {a.outlet ? (
                    <p className="mt-1 text-[14px] text-fam-muted">with {a.outlet}</p>
                  ) : null}
                </a>
                {a.record_id ? (
                  <EditPill
                    href={`/admin/collections/appearances/${a.record_id}`}
                    signedIn={signedIn}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`fam-section-rule pt-6 ${featured.length ? "mt-20" : ""}`}>
        <h2 className="fam-eyebrow">The full log</h2>
        <ul className="mt-6">
          {sorted.map((a) => (
            <li key={a.url ?? a.title} className="fam-item relative">
              <ItemControls
                signedIn={signedIn}
                pageId={pageId}
                blockIndex={blockIndex}
                blockId={blockId}
                collection="appearances"
                id={a.record_id ?? null}
                label={a.title}
              />
              <a
                href={a.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="fam-card group grid items-center gap-x-6 gap-y-2 py-5 sm:grid-cols-[5.5rem_1fr_9rem_7rem]"
              >
                {/* An 88px still per row: enough to recognise a show at a
                    glance, not enough to turn a 57-row log into a gallery. */}
                <div className="w-[5.5rem] shrink-0">
                  <ImageWell
                    src={a.thumbnail ?? null}
                    alt={a.title}
                    label={a.title.slice(0, 2)}
                    shape="cinema"
                    width={220}
                  />
                </div>
                <span>
                  <span className="fam-display-sm text-[17px] leading-snug">{a.title}</span>
                  {a.outlet ? (
                    <span className="ml-2 text-[14px] text-fam-muted">with {a.outlet}</span>
                  ) : null}
                  {(a.parts?.length ?? 0) > 1 ? (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fam-faint">
                      {a.parts!.length} parts
                    </span>
                  ) : null}
                  {featuredUrls.has(a.url) ? (
                    <span className="ml-2 border border-fam-ink px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-fam-ink">
                      Top
                    </span>
                  ) : null}
                </span>
                <span className="text-[13px] font-medium tabular-nums text-fam-muted sm:text-right">
                  {a.aired ?? "—"}
                </span>
                <span className="text-[13px] tabular-nums text-fam-faint sm:text-right">
                  {a.views ? `${fmt.format(a.views)} views` : ""}
                </span>
              </a>
              {a.record_id ? (
                <div className="-mt-2 pb-4 sm:pl-[6.5rem]">
                  <EditPill
                    href={`/admin/collections/appearances/${a.record_id}`}
                    signedIn={signedIn}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="border-t border-fam-rule" />
      </section>
    </>
  );
}
