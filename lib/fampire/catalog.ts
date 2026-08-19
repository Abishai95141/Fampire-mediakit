/**
 * The FAMPIRE catalog — pure functions over an `Entry[]`.
 *
 * Nothing here hosts a file. Every entry is a described pointer at storage the
 * client already owns (§2.1), so `url` is the product.
 *
 * This file used to open with a static JSON import and expose `ENTRIES` as a
 * module-level array. It now takes the entries as an argument instead, and the
 * data arrives from Payload via `./payload-catalog`.
 *
 * The change was NOT free, and it is worth recording why. §2.6 predicted that
 * swapping the import would leave "every page and component untouched". That
 * held for the facet and search functions, which already took an `Entry[]`
 * parameter — but four helpers closed over the module-level array, and every
 * page read `ENTRIES` and `PUBLIC_ENTRIES` as synchronous constants. A
 * constant cannot become a database query without its callers awaiting it, so
 * the pages did have to change. Finding that out at stage 2 is the point of
 * doing stage 2 early (§12).
 *
 * Two constraints §2.6 flagged, now resolved:
 *  - The public/private split is no longer computed at module scope, so it is
 *    no longer frozen into the prerendered output at build time. Flipping an
 *    entry to private takes effect on the next request.
 *  - The search index is no longer built at module load; it is memoised per
 *    entries array, so it is rebuilt when the data changes and not before.
 */

export type Platform =
  | "drive" | "dropbox" | "pictime" | "vimeo" | "youtube" | "streaming" | "site" | "unknown";

export type Access = "public" | "password" | "request" | "broken";

export type Kind =
  | "b-roll" | "event photography" | "headshots" | "poster" | "logo"
  | "trailer" | "BTS" | "podcast" | "press" | "magazine" | "document";

export type Subject = "anthony" | "tereza" | "love" | "legend" | (string & {});

export type Entry = {
  /**
   * The PUBLIC identity: the client's Drive folder id, which is stable across
   * every copy of the database and is what public URLs fall back to. It is
   * deliberately NOT the database row id.
   */
  id: string;
  /**
   * The DATABASE row id, for admin deep links only.
   *
   * These have to be two fields. `id` above is the Drive folder id, so
   * `/admin/collections/entries/${entry.id}` asked Payload for a document
   * whose primary key was "1iRIVHXfAVJmNxMSd6IMcNgk_cl5UwA34" and got
   * "could not be found" on every Edit link on the site. Row ids also differ
   * between the local and production databases, so they can never be the
   * public identifier — which is exactly why `id` is the folder id.
   */
  record_id: number | string;
  title: string;
  description: string;
  url: string;
  /** Original URL, when we rewrote an account-scoped or tracking-laden one. */
  rewritten_from: string | null;
  alternates: string[];
  preview: string | null;
  source_platform: Platform;
  access: Access;
  visibility: "public" | "private";
  kind: Kind;
  subjects: Subject[];
  brands: string[];
  film: string | null;
  event: string | null;
  year: number | null;
  /** DRAFT flag. Never treat as decided — see contains_minor_confirmed. */
  contains_minor: boolean;
  contains_minor_confirmed: boolean;
  image: string | null;
  /** Up to four more frames from the same folder — a contact sheet, not a crop. */
  strip: string[];
  /** Every frame in the folder is a flat fill (chroma plate, transparent logo):
   *  show it contained on the paper ground, never cover-cropped. */
  image_flat: boolean;
  /** How we got the picture: drive-folder | drive-file | vimeo | youtube | og |
   *  dropbox-file | borrowed-film-art. Null when there is none. */
  image_source: string | null;
  source_page: string | null;
  /** Written by scripts/fampire/check-links.mjs. `unchecked` means the sweep
   *  has not run, NOT that the link is fine. */
  status:
    | "unchecked" | "ok" | "gone" | "login-required"
    | "password" | "timeout" | "blocked";
  /** Why, in one phrase — shown to the internal team, not to the public. */
  status_detail: string | null;
  last_checked: string | null;

  // ── Added when the catalog moved to Payload ──────────────────────────
  // Optional so anything written against the original static shape still
  // type-checks. All are populated by the Payload read layer.
  /** Named guests — everyone in `people` who is not one of the four family
   *  members. Family members remain in `subjects`. */
  /** The shareable URL segment for this collection. */
  slug?: string;
  /** A Drive file id verified to render — drives the unfurl image. */
  preview_file_id?: string | null;
  people?: string[];
  /** Made it — shot, cut, produced. NOT a claim they are in the frame. */
  crew?: string[];
  /** From "owned by X" / "courtesy of X" in the source folder. */
  rights_holders?: string[];
  /** What the material came FROM, alongside `kind` (what it IS). */
  occasion?: string | null;
  location?: string | null;
  /** The client's own folder ancestry as plain text, for search only. Never
   *  rendered publicly — it is production vocabulary, not a reader's. */
  folder_path_text?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  magazine_issue?: number | null;
  /** Measured by sampling real thumbnails. `null` means the sampler could not
   *  read a frame — NOT a claim of landscape. */
  orientation?: "landscape" | "portrait" | "square" | "mixed" | null;
  file_count?: number;
};

export type WatchLink = { film: string; platform: string; url: string; free: boolean };

export {
  loadEntries,
  loadWatchLinks,
  loadFilms,
  loadFamily,
  loadPeople,
  loadAppearances,
  loadChrome,
  heldBackCount,
  type FilmRecord,
  type PersonRecord,
  type AppearanceRecord,
  type SiteChrome,
} from "./payload-catalog";

/**
 * The entries this reader may see.
 *
 * A signed-out visitor gets published collections only — which is every public
 * press surface, ungated, no login and no email capture (§2.4). A signed-in
 * member of the internal team additionally sees drafts and held-back
 * collections.
 */
export async function visibleEntries(signedIn: boolean, brand?: string): Promise<Entry[]> {
  const { loadEntries } = await import("./payload-catalog");
  return loadEntries({ includeDrafts: signedIn, brand });
}

// ── Presentation labels ─────────────────────────────────────────────────

export const SUBJECT_LABEL: Record<string, string> = {
  anthony: "Anthony Lolli",
  // TereZa is always spelled with a capital Z — everywhere, including alt
  // text and metadata. Hard rule from the client.
  tereza: "TereZa Hakobyan-Lolli",
  love: "Love Lolli",
  legend: "Legend Lolli",
};

export const BRAND_LABEL: Record<string, string> = {
  "biohack-yourself": "Biohack Yourself",
  "lolli-brands": "Lolli Brands Entertainment",
  "lolli-holdings": "Lolli Holdings",
  hnn: "HNN",
};

/**
 * Sort options a reader can actually choose.
 *
 * Order was hardcoded to `-fileCount` everywhere, which meant the best match
 * for a search could render four hundred cards down — search was a filter, not
 * a ranker. `relevance` is the default when a query is present.
 */
export const SORTS = {
  relevance: "Best match",
  largest: "Most material",
  newest: "Newest first",
  oldest: "Oldest first",
  az: "A–Z",
} as const;

/**
 * A one-edit-away suggestion, for when a query finds nothing.
 *
 * `terza` returned zero — a single transposed letter in the name of the
 * editor-in-chief. Full trigram search in Postgres would fix this class of
 * problem properly (and is the right long-term answer), but it moves search
 * into SQL. This is the cheap 90%: build a vocabulary from the names that
 * matter and offer the nearest one, so a near-miss lands somewhere instead of
 * on an empty page.
 */
function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      best = Math.min(best, cur[j]!);
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length]! <= max;
}

export function suggestTerm(entries: Entry[], q: string): string | null {
  const term = normalize(q).trim();
  if (!term || term.length < 4) return null;

  const vocab = new Set<string>();
  for (const e of entries) {
    for (const w of normalize(
      [e.title, e.film, e.event, e.location, ...(e.people ?? [])].filter(Boolean).join(" "),
    ).split(/\s+/)) {
      if (w.length >= 4) vocab.add(w);
    }
  }
  // Closest first, so "terza" prefers "tereza" over a longer near-match.
  let best: string | null = null;
  for (const w of vocab) {
    if (!editDistanceWithin(term, w, term.length > 6 ? 2 : 1)) continue;
    if (!best || Math.abs(w.length - term.length) < Math.abs(best.length - term.length)) best = w;
  }
  return best;
}

export function sortEntries(entries: Entry[], sort: string | undefined, q?: string): Entry[] {
  const out = [...entries];
  switch (sort) {
    case "largest": return out.sort((a, b) => (b.file_count ?? 0) - (a.file_count ?? 0));
    case "newest": return out.sort((a, b) => String(b.date_start ?? "").localeCompare(String(a.date_start ?? "")));
    case "oldest": return out.sort((a, b) => String(a.date_start ?? "").localeCompare(String(b.date_start ?? "")));
    case "az": return out.sort((a, b) => a.title.localeCompare(b.title));
    default: {
      if (!q) return out.sort((a, b) => (b.file_count ?? 0) - (a.file_count ?? 0));
      // Relevance: a title hit beats a description hit beats anything else,
      // then bigger collections first as the tie-break.
      const terms = normalize(q).split(/\s+/).filter(Boolean);
      const score = (e: Entry) => {
        const t = normalize(e.title);
        const d = normalize(e.description);
        let n = 0;
        for (const term of terms) {
          if (new RegExp(`\\b${term}`).test(t)) n += 10;
          else if (new RegExp(`\\b${term}`).test(d)) n += 3;
          else n += 1;
        }
        return n;
      };
      return out.sort((a, b) => score(b) - score(a) || (b.file_count ?? 0) - (a.file_count ?? 0));
    }
  }
}

/** Readable names for the kind vocabulary, for headings and breadcrumbs. */
export const KIND_LABEL_FALLBACK: Record<string, string> = {
  "b-roll": "B-Roll",
  "event photography": "Event Photography",
  headshots: "Headshots",
  poster: "Key Art",
  logo: "Logos",
  trailer: "Trailer",
  BTS: "Behind the Scenes",
  podcast: "Podcast",
  press: "Press",
  magazine: "Magazine",
  document: "Documents",
  interview: "Interviews",
  audio: "Audio",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  drive: "Google Drive",
  dropbox: "Dropbox",
  pictime: "Pic-Time",
  vimeo: "Vimeo",
  youtube: "YouTube",
  streaming: "Streaming",
  site: "Web",
  unknown: "—",
};

// ── Facets ──────────────────────────────────────────────────────────────

export type Facets = {
  q?: string;
  kind?: string;
  subject?: string;
  year?: string;
  brand?: string;
  film?: string;
  event?: string;
  /**
   * What the material came FROM, alongside `kind` (what it IS).
   * Makes "video from a book signing" a query rather than a browse.
   */
  occasion?: string;
  location?: string;
  person?: string;
  issue?: string;
  sort?: string;
  page?: string;
  /**
   * Measured by sampling real pixels — the axis §8's editor criterion turns
   * on: "finds and opens vertical b-roll for any family member in <30s".
   * It existed in the database and the API for a while before it existed
   * here, which meant `?orientation=portrait` was silently ignored on the
   * site while appearing to work through the API.
   */
  orientation?: string;
};

/** Every filter state is URL-addressable — this is the parse half of that. */
export function facetsFromParams(params: Record<string, string | string[] | undefined>): Facets {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return {
    q: one(params.q),
    kind: one(params.kind),
    subject: one(params.subject),
    year: one(params.year),
    brand: one(params.brand),
    film: one(params.film),
    event: one(params.event),
    occasion: one(params.occasion),
    orientation: one(params.orientation),
    location: one(params.location),
    person: one(params.person),
    issue: one(params.issue),
    sort: one(params.sort),
    page: one(params.page),
  };
}

/** And this is the serialise half. Empty values drop out, so URLs stay clean. */
export function facetsToQuery(f: Facets): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * Search vocabulary bridging.
 *
 * The catalog speaks production language — `b-roll`, `event photography`,
 * `BTS` — and a journalist on deadline types press language: "clips",
 * "photos", "behind the scenes", "kids". Measured against a battery of
 * realistic queries, twelve of fifty-eight returned nothing, and almost all of
 * those were vocabulary mismatches rather than genuinely absent material.
 *
 * These are folded into each entry's index text at module load, so the match
 * stays a plain substring test — no scoring, no fuzzy library, nothing to tune.
 */
const KIND_ALIASES: Record<string, string> = {
  "b-roll": "broll clips footage video videos raw cutaway",
  "event photography": "photos photography stills pictures pics gallery galleries shoot",
  headshots: "headshot portrait portraits bio bios profile",
  poster: "posters key art artwork keyart onesheet",
  logo: "logos wordmark mark marks identity branding",
  trailer: "trailers teaser teasers promo",
  BTS: "bts behind the scenes making of production",
  magazine: "magazines issue issues print editorial cover covers",
  press: "press coverage article articles news media",
  podcast: "podcasts episode episodes audio interview interviews",
  document: "documents doc docs pdf paperwork",
};

/** Orientation is asked for in plain language: an editor types "vertical",
 *  not "portrait". */
const ORIENTATION_ALIASES: Record<string, string> = {
  portrait: "vertical upright tall 9x16 reels shorts tiktok stories",
  landscape: "horizontal wide 16x9 widescreen",
  square: "square 1x1",
  mixed: "mixed assorted",
};

/** Children are searched for by relationship far more than by name. */
const SUBJECT_ALIASES: Record<string, string> = {
  love: "kids children child daughter family",
  legend: "kids children child son family",
  anthony: "family couple parents founder",
  tereza: "family couple parents",
};

/** Punctuation is noise here: `b-roll` and `broll`, `TereZa` and `tereza`, and
 *  `Bye Ol' Dentistry` and `bye ol dentistry` must all be the same token. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haystack(e: Entry): string {
  return normalize(
    [
      e.title,
      e.description,
      e.film,
      e.event,
      e.kind,
      KIND_ALIASES[e.kind],
      ...e.subjects.map((s) => `${SUBJECT_LABEL[s] ?? s} ${SUBJECT_ALIASES[s] ?? ""}`),
      ...e.brands.map((b) => BRAND_LABEL[b] ?? b),
      // NOT the platform label. "Google Drive" was folded into every haystack,
      // so `?q=drive` and `?q=google` each matched all 476 entries — a query
      // that returns everything is a query that answers nothing.
      // Named guests. 321 entries carry them and they were reachable only by
      // accident, when the name happened to be templated into the title.
      ...(e.people ?? []),
      e.location,
      e.occasion,
      e.orientation,
      e.orientation ? ORIENTATION_ALIASES[e.orientation] : null,
      e.year,
      e.magazine_issue ? `issue ${e.magazine_issue} issue#${e.magazine_issue}` : null,
      /**
       * The client's own folder vocabulary.
       *
       * 304 published entries have "master" in their path and 95 have
       * "deliverables" — the words the media team uses every day — and both
       * returned zero results. The renamed title is for strangers; this keeps
       * the original words findable for the people who own the archive.
       */
      e.folder_path_text,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Search haystacks, memoised per entries array.
 *
 * Built at module load this would have captured one snapshot of the catalog
 * for the lifetime of the process. Keyed on the array in a WeakMap, it is
 * built once per distinct result set and collected with it.
 */
const INDEXES = new WeakMap<Entry[], Map<string, string>>();

function indexFor(entries: Entry[]): Map<string, string> {
  let idx = INDEXES.get(entries);
  if (!idx) {
    idx = new Map(entries.map((e) => [e.id, haystack(e)]));
    INDEXES.set(entries, idx);
  }
  return idx;
}

/**
 * Every term must match somewhere, so "tereza 2025" narrows rather than
 * widening — which is what someone typing two words actually means.
 *
 * Singular and plural are treated as the same word. Not stemming properly,
 * just testing the term with and without a trailing "s": that covers
 * photo/photos, trailer/trailers, logo/logos and bio/bios, which is the whole
 * of the observed problem, without dragging in a stemmer that would also
 * conflate things a reader meant to keep apart.
 */
/**
 * Word-boundary matching, not substring.
 *
 * Substring matching made short queries useless: `bio` matched 135 of 476
 * (inside "biohack"), `pro` matched 129, `oll` matched 392 (inside "Lolli" and
 * "roll"). A press contact typing three letters got a third of the archive and
 * no way to tell why.
 *
 * A term still matches a PREFIX of a word, because typing half a name and
 * getting the rest is the one substring behaviour people actually want —
 * `ashto` should find Ashton Hall. What it no longer does is match the middle
 * of an unrelated word.
 */
function matches(h: string, term: string): boolean {
  if (!term) return false;
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // \b then the term: start-of-word only.
  if (new RegExp(`\\b${t}`).test(h)) return true;
  // Naive plural/singular bridging, kept from the original.
  if (term.length > 3 && term.endsWith("s") && new RegExp(`\\b${t.slice(0, -1)}`).test(h)) return true;
  if (term.length > 2 && new RegExp(`\\b${t}s`).test(h)) return true;
  return false;
}

function search(entries: Entry[], q: string | undefined): Entry[] {
  const terms = normalize(q ?? "").split(" ").filter(Boolean);
  if (!terms.length) return entries;
  const index = indexFor(entries);
  return entries.filter((e) => {
    const h = index.get(e.id) ?? haystack(e);
    return terms.every((t) => matches(h, t));
  });
}

export function applyFacets(entries: Entry[], f: Facets): Entry[] {
  let out = search(entries, f.q);
  if (f.kind) out = out.filter((e) => e.kind === f.kind);
  if (f.subject) out = out.filter((e) => e.subjects.includes(f.subject!));
  if (f.year) out = out.filter((e) => String(e.year) === f.year);
  if (f.brand) out = out.filter((e) => e.brands.includes(f.brand!));
  if (f.film) out = out.filter((e) => e.film === f.film);
  if (f.event) out = out.filter((e) => e.event === f.event);
  if (f.occasion) out = out.filter((e) => e.occasion === f.occasion);
  if (f.orientation) out = out.filter((e) => e.orientation === f.orientation);
  if (f.location) out = out.filter((e) => e.location === f.location);
  // Guest people — 321 entries carry them and no control reached them before.
  if (f.person) out = out.filter((e) => (e.people ?? []).includes(f.person!));
  if (f.issue) out = out.filter((e) => String(e.magazine_issue ?? "") === f.issue);
  return out;
}

/**
 * Counts are computed against the set filtered by every OTHER facet, so a
 * facet value showing "6" always yields 6 results when clicked, and options
 * that would yield nothing disappear instead of becoming dead ends.
 */
export function facetCounts(entries: Entry[], f: Facets, axis: keyof Facets): [string, number][] {
  const rest: Facets = { ...f, [axis]: undefined };
  const pool = applyFacets(entries, rest);
  const counts = new Map<string, number>();
  const bump = (k: string | number | null) => {
    if (k === null || k === undefined || k === "") return;
    const key = String(k);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const e of pool) {
    if (axis === "kind") bump(e.kind);
    else if (axis === "subject") e.subjects.forEach(bump);
    else if (axis === "year") bump(e.year);
    else if (axis === "brand") e.brands.forEach(bump);
    else if (axis === "film") bump(e.film);
    else if (axis === "event") bump(e.event);
    else if (axis === "occasion") bump(e.occasion ?? null);
    else if (axis === "orientation") bump(e.orientation ?? null);
    else if (axis === "location") bump(e.location ?? null);
    else if (axis === "person") for (const p of e.people ?? []) bump(p);
    else if (axis === "issue") bump(e.magazine_issue ? String(e.magazine_issue) : null);
  }

  return [...counts.entries()].sort((a, b) =>
    axis === "year" ? b[0].localeCompare(a[0]) : b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

// ── Curated lenses over the same pool ───────────────────────────────────
// Sections are lenses; the Library is the pool. A collection is never
// duplicated, only seen from more than one angle.

export const FILMS = [
  { slug: "biohack-yourself", title: "Biohack Yourself", awards: 16, note: "Five-part flagship", year: 2024 },
  { slug: "the-guru", title: "The Guru", awards: 19, note: "Most decorated on the slate", year: 2024 },
  { slug: "skin-deep", title: "Skin Deep", awards: 13, note: "Feature documentary", year: 2023 },
  { slug: "the-super-lollis", title: "The Super Lollis", awards: 13, note: "Six episodes", year: 2022 },
  { slug: "from-fat-lolli", title: "From Fat Lolli to 6 Pack Lolli", awards: 4, note: "The origin story", year: 2020 },
  { slug: "shealed", title: "sHEALed", awards: 3, note: "Four parts · releasing 2026", year: 2026 },
  { slug: "bye-ol-dentistry", title: "Bye Ol' Dentistry", awards: 0, note: "In production", year: 2026 },
  { slug: "the-new-woo", title: "The New Woo", awards: 0, note: "In pre-production", year: 2026 },
] as const;

/** Derived so the front door and the films page can never drift apart. */
export const FILM_AWARDS = FILMS.reduce((n, f) => n + f.awards, 0);

/** The four intent lanes on the front door — each a pre-filtered Library view. */
export const LANES = [
  {
    href: "/library?kind=headshots",
    label: "Book them",
    detail: "Bios, headshots and the introduction an MC reads out loud.",
  },
  {
    href: "/library?kind=press",
    label: "Write about them",
    detail: "Synopses, award counts, press coverage and approved copy.",
  },
  {
    href: "/library?kind=b-roll",
    label: "Clip them",
    detail: "B-roll, trailers and cut recaps, straight into the timeline.",
  },
  {
    href: "/library?kind=event+photography",
    label: "Stage them",
    detail: "Event photography, galleries and logo packs for the room.",
  },
] as const;

/**
 * The best available picture for a person, film or event — the highest-signal
 * entry that carries one. Ordered so a headshot folder beats a b-roll dump and
 * key art beats a master folder, which is what makes a lens page look composed
 * rather than assembled from whatever happened to have a thumbnail.
 */
const KIND_RANK: Record<string, number> = {
  headshots: 0,
  poster: 1,
  "event photography": 2,
  trailer: 3,
  magazine: 4,
  BTS: 5,
  "b-roll": 6,
};

function bestOf(entries: Entry[]): Entry | null {
  const withImage = entries.filter((e) => e.image);
  if (!withImage.length) return null;
  return [...withImage].sort(
    (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9),
  )[0];
}

/**
 * Previews for a row of people, guaranteed distinct.
 *
 * Love and Legend share a bio-and-headshots folder, so asking for each one's
 * best picture independently returns the same frame twice — which on a
 * four-up row reads as a bug, not as a shared source. Walk each subject's
 * candidates (best entry first, then the other frames from that folder's
 * contact strip, then the next entry) and take the first not already spent.
 */
export function previewsForSubjects(
  entries: Entry[],
  subjects: readonly string[],
): Record<string, string | null> {
  const used = new Set<string>();
  const out: Record<string, string | null> = {};

  for (const subject of subjects) {
    const pool = entries.filter((e) => e.subjects.includes(subject) && e.image).sort(
      (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9),
    );

    const candidates: string[] = [];
    for (const e of pool) {
      if (e.image) candidates.push(e.image);
      // Strip frames come from the same folder, so a sibling headshot is a
      // better second choice than a picture from an unrelated collection.
      for (const frame of e.strip) candidates.push(frame);
    }

    const pick = candidates.find((c) => !used.has(normalizeFrame(c))) ?? candidates[0] ?? null;
    if (pick) used.add(normalizeFrame(pick));
    out[subject] = pick;
  }

  return out;
}

/** The same Drive file appears at several widths across `image` and `strip`;
 *  compare on the id so those count as one picture, not four. */
function normalizeFrame(url: string): string {
  return url.replace(/([?&])sz=w\d+/, "$1sz=x");
}

export const previewForFilm = (entries: Entry[], film: string) =>
  bestOf(entries.filter((e) => e.film === film));

export function stats(entries: Entry[], watch: WatchLink[] = []) {
  const pub = entries.filter((e) => e.visibility === "public").length;
  const films = new Set(entries.map((e) => e.film).filter(Boolean)).size;
  const events = new Set(entries.map((e) => e.event).filter(Boolean)).size;
  return { total: entries.length, pub, films, events, watch: watch.length };
}
