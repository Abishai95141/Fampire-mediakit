import config from "@payload-config";
import { getPayload, type Where } from "payload";

import type { Access, Entry, Kind, Platform, WatchLink } from "./catalog";

/**
 * The Payload read layer — the other side of the seam.
 *
 * `lib/fampire/catalog.ts` used to begin with a static JSON import. Everything
 * below that line was pure functions over an `Entry[]`, which is exactly what
 * made the swap possible: this module returns the SAME 21-field shape, so
 * every page, component, facet counter and search call keeps working with no
 * edit. If a page had needed changing, the seam was in the wrong place.
 *
 * Two constraints §2.6 flagged, and how they are handled:
 *
 *  - `PUBLIC_ENTRIES` used to be computed at module scope, freezing the
 *    public/private split into prerendered pages at build time. Flipping an
 *    entry to private would not remove it from `/fampire` until a redeploy.
 *    Everything here is request-scoped and cached per request instead.
 *  - `INDEX` built the whole search haystack at module load. Fine at 559, not
 *    fine past a few thousand. Search still runs in-process for now — the
 *    handover point to Postgres full-text search is documented below.
 */

/** Payload's shape, before it is flattened back to the front end's contract. */
type Rel = { slug?: string; title?: string; label?: string; name?: string } | number | null;

const slugOf = (r: Rel): string | null =>
  r && typeof r === "object" ? (r.slug ?? null) : null;
/** Names out of a hasMany relationship, resolved or not. */
const relNames = (v: unknown): string[] =>
  Array.isArray(v)
    ? (v as Rel[]).map((r) => (r && typeof r === "object" ? r.name ?? null : null)).filter(Boolean) as string[]
    : [];

const titleOf = (r: Rel): string | null =>
  r && typeof r === "object" ? (r.title ?? r.label ?? r.name ?? null) : null;

/**
 * One Payload document → one `Entry`.
 *
 * The front end's `Entry` is deliberately flat: `film` is a string, not a
 * relationship. Flattening here rather than teaching every component about
 * Payload's relationship objects is what keeps the seam a seam.
 */
export function toEntry(doc: Record<string, unknown>): Entry {
  const people = Array.isArray(doc.people) ? (doc.people as Rel[]) : [];

  // The four family members are the front end's `subjects`; everyone else is a
  // named guest. Both come from the same `people` relationship in the CMS.
  const subjects: string[] = [];
  const guests: string[] = [];
  for (const p of people) {
    if (!p || typeof p !== "object") continue;
    const isFamily = (p as { isFamily?: boolean }).isFamily;
    if (isFamily && p.slug) subjects.push(p.slug);
    else if (p.name) guests.push(p.name);
  }

  const tenant = doc.tenant as Rel;

  /**
   * The card picture, in order of who decided it.
   *
   * An editor's choice beats a machine's every time: a hand-set `previewUrl`
   * or uploaded `previewImage` wins over the frame the orientation sampler
   * picked. Before this the sampled frame was the ONLY source, so a collection
   * whose folder the sampler could not read was a grey placeholder with no way
   * to fix it from the CMS.
   */
  const uploaded = doc.previewImage as { url?: string } | null;
  const chosenPreview =
    (typeof doc.previewUrl === "string" && doc.previewUrl.trim() ? doc.previewUrl.trim() : null) ??
    (uploaded && typeof uploaded === "object" ? uploaded.url ?? null : null);
  const sampledPreview = doc.previewFileId
    ? `https://drive.google.com/thumbnail?id=${doc.previewFileId}&sz=w800`
    : null;
  const preview = chosenPreview ?? sampledPreview;

  return {
    id: String(doc.folderId ?? doc.id),
    slug: (doc.slug as string) ?? String(doc.folderId ?? doc.id),
    preview_file_id: (doc.previewFileId as string) ?? null,
    title: String(doc.title ?? ""),
    description: String(doc.description ?? ""),
    url: String(doc.url ?? ""),
    rewritten_from: (doc.rewrittenFrom as string) ?? null,
    alternates: Array.isArray(doc.alternates)
      ? (doc.alternates as { url: string }[]).map((a) => a.url)
      : [],
    // Resolved above: an editor's chosen image, else the frame the orientation
    // sampler PROVED Drive renders. The sampled frames were measured and stored
    // and then never surfaced, because this mapper hard-coded null — so every
    // card fell back to its "no public preview" placeholder and the whole
    // library looked like black boxes.
    preview,
    source_platform: (doc.sourcePlatform as Platform) ?? "drive",
    access: (doc.access as Access) ?? "public",
    // `_status` is the single source of truth for what a signed-out reader
    // sees. An unpublished draft is private, whatever else it says.
    visibility: doc._status === "published" ? "public" : "private",
    kind: (doc.kind as Kind) ?? "b-roll",
    subjects,
    brands: slugOf(tenant) ? [slugOf(tenant)!] : [],
    film: titleOf(doc.film as Rel),
    event: titleOf(doc.event as Rel),
    year: (doc.year as number) ?? null,
    contains_minor: Boolean(doc.containsMinor),
    contains_minor_confirmed: Boolean(doc.containsMinorConfirmed),
    image: preview,
    strip: [],
    image_flat: false,
    image_source: null,
    source_page: null,
    status: (doc.linkStatus as Entry["status"]) ?? "unchecked",
    status_detail: (doc.linkStatusDetail as string) ?? null,
    last_checked: (doc.lastChecked as string) ?? null,
    // Fields the CMS knows about and the original static contract did not.
    // Additive, so nothing that reads the old shape breaks.
    people: guests,
    // Roles kept apart: "Featuring" is a claim about who is in the frame.
    crew: relNames(doc.crew),
    rights_holders: relNames(doc.rightsHolder),
    occasion: (doc.occasion as string) ?? null,
    location: titleOf(doc.location as Rel),
    // Search-only: the client's own folder vocabulary ("master",
    // "deliverables") which readers never see but the team searches by.
    folder_path_text: (doc.folderPath as string) ?? null,
    date_start: (doc.dateStart as string) ?? null,
    date_end: (doc.dateEnd as string) ?? null,
    magazine_issue: (doc.magazineIssue as number) ?? null,
    orientation: (doc.orientation as Entry["orientation"]) ?? null,
    file_count: (doc.fileCount as number) ?? 0,
  } as Entry;
}

/**
 * Fetch the catalog for this request.
 *
 * Cached per request, not per process: a module-level cache is what froze the
 * public/private split into the build output before. React's `cache` scopes it
 * to the render, so two components on one page share one query and the next
 * request sees fresh data.
 */
import { cache } from "react";

export const loadEntries = cache(
  async (opts?: { includeDrafts?: boolean; brand?: string }): Promise<Entry[]> => {
    const payload = await getPayload({ config });

    // Scope to one world when asked. Without this every brand surface would
    // render the whole institution's catalog, which defeats tenancy at exactly
    // the point a reader would notice.
    let tenantId: number | string | undefined;
    if (opts?.brand) {
      const brands = await payload.find({
        collection: "brands",
        where: { slug: { equals: opts.brand } },
        limit: 1,
        depth: 0,
      });
      tenantId = brands.docs[0]?.id;
      if (!tenantId) return [];
    }

    const where: Where = {};
    if (!opts?.includeDrafts) where._status = { equals: "published" };
    if (tenantId) where.tenant = { equals: tenantId };

  const result = await payload.find({
    collection: "entries",
    // 559 rows of text. One query is cheaper than paginating, and the whole
    // point of a catalog this size is that retrieval feels instant.
    limit: 2000,
    // Deep enough to resolve tenant, film, event, location and people.
    depth: 1,
    draft: opts?.includeDrafts ?? false,
    where,
    sort: "-fileCount",
    // A signed-in caller has already been authenticated by lib/fampire/auth;
    // a signed-out one must go through access control so drafts stay internal.
    overrideAccess: Boolean(opts?.includeDrafts),
    ...(opts?.includeDrafts ? {} : { user: null }),
  });

    return result.docs.map((d) => toEntry(d as unknown as Record<string, unknown>));
  },
);

/** Where-to-watch, assembled from the Films collection rather than a second
 *  hand-maintained table (§3.1 — storing the URL is the correct treatment). */
export const loadWatchLinks = cache(async (): Promise<WatchLink[]> => {
  const payload = await getPayload({ config });
  const films = await payload.find({ collection: "films", limit: 100, depth: 0 });

  const out: WatchLink[] = [];
  for (const f of films.docs) {
    for (const w of (f.watch ?? []) as { platform: string; url: string; free?: boolean }[]) {
      out.push({ film: f.title as string, platform: w.platform, url: w.url, free: Boolean(w.free) });
    }
  }
  return out;
});

/**
 * SEARCH — the documented handover point.
 *
 * Search still runs in-process over the loaded array (see `catalog.ts`), which
 * is correct at 559 rows and returns in single-digit milliseconds. Past a few
 * thousand entries this becomes the bottleneck and should move to Postgres
 * full-text search: add a generated tsvector column over title, description,
 * film, event and people, and replace `applyFacets`' `search()` with a
 * `where: { _search: { like: q } }` clause. Nothing above the seam changes.
 */

// ── Editable content ────────────────────────────────────────────────────
// These three used to be constants in the code, which meant the client could
// not change the film slate, the family bios or the navigation without a
// developer. They are CMS records now; these are the readers.

export type FilmRecord = {
  slug: string;
  title: string;
  awards?: number | null;
  note?: string | null;
  year?: number | null;
  synopsis?: string | null;
  status?: string | null;
  watch?: { platform: string; url: string; free?: boolean }[] | null;
};

export const loadFilms = cache(async (): Promise<FilmRecord[]> => {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: "films", limit: 100, depth: 0, sort: "-awards" });
  return r.docs as unknown as FilmRecord[];
});

export type PersonRecord = {
  slug: string;
  name: string;
  role?: string | null;
  bio?: string | null;
  isFamily?: boolean | null;
  isMinor?: boolean | null;
};

/** The four family members, in the order the People page presents them. */
export const loadFamily = cache(async (): Promise<PersonRecord[]> => {
  const payload = await getPayload({ config });
  const r = await payload.find({
    collection: "people",
    where: { isFamily: { equals: true } },
    limit: 20,
    depth: 0,
  });
  const order = ["anthony", "tereza", "love", "legend"];
  return (r.docs as unknown as PersonRecord[]).sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );
});

/** Everyone, for when a block names specific people rather than the family. */
export const loadPeople = cache(async (): Promise<PersonRecord[]> => {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: "people", limit: 500, depth: 0, sort: "name" });
  return r.docs as unknown as PersonRecord[];
});

export type AppearanceRecord = {
  title: string;
  url?: string | null;
  outlet?: string | null;
  aired?: string | null;
  views?: number | null;
  thumbnail?: string | null;
  parts?: { label: string; url: string }[] | null;
};

/**
 * The press log.
 *
 * These were read straight out of `data/fampire/appearances.json` by the Press
 * route, which is why logging a new appearance meant re-running a scraper
 * instead of filling in a form — §8 asks for "<2 min, appears publicly", and a
 * JSON file in the repo cannot meet that. They are CMS records now.
 *
 * `date` is stored as a real date and formatted here, so the log sorts
 * correctly no matter how the original prose spelled the month.
 */
export const loadAppearances = cache(async (): Promise<AppearanceRecord[]> => {
  const payload = await getPayload({ config });
  const r = await payload.find({
    collection: "appearances",
    limit: 500,
    depth: 0,
    sort: "-date",
    overrideAccess: false,
    user: null,
  });
  return r.docs.map((d) => {
    const doc = d as unknown as Record<string, unknown>;
    return {
      title: String(doc.title ?? ""),
      url: (doc.url as string) ?? null,
      outlet: (doc.outlet as string) ?? null,
      aired: doc.date ? formatAired(String(doc.date)) : null,
      views: (doc.views as number) ?? null,
      thumbnail: (doc.thumbnail as string) ?? null,
      parts: (doc.parts as { label: string; url: string }[]) ?? null,
    };
  });
});

const AIRED_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** UTC, deliberately: a date-only field rendered in local time shows the
 *  previous day for anyone west of Greenwich. */
function formatAired(iso: string): string | null {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : AIRED_FORMAT.format(new Date(t));
}

export type SiteChrome = {
  nav: { label: string; href: string }[];
  footer: {
    blurb?: string | null;
    links?: { label: string; href: string }[] | null;
    trademarkNote?: string | null;
  };
  searchPlaceholder?: string | null;
};

/**
 * Navigation, footer and shared strings.
 *
 * Falls back to the previous hardcoded nav if no record exists, so a fresh
 * database still renders a usable site rather than a masthead with no links.
 */
export const loadChrome = cache(async (): Promise<SiteChrome> => {
  const fallback: SiteChrome = {
    nav: [
      { label: "The Library", href: "/library" },
      { label: "Films", href: "/films" },
      { label: "People", href: "/people" },
      { label: "Press", href: "/press" },
    ],
    footer: {},
  };
  try {
    const payload = await getPayload({ config });
    const r = await payload.find({ collection: "site-settings", limit: 1, depth: 0 });
    const doc = r.docs[0] as unknown as SiteChrome | undefined;
    if (!doc?.nav?.length) return fallback;
    return doc;
  } catch {
    return fallback;
  }
});
