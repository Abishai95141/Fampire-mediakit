/**
 * Derivations over a folder's ancestry path.
 *
 * All metadata signal is in the folder path — measured across all 135,611
 * files, 59% of filenames are camera defaults and person names appear in 0.1%
 * (build plan §7.4). So every function here reads the PATH, never a filename.
 *
 * Enrichment is verification, not authoring: these produce drafts a human
 * confirms during sign-off. Two fields are never inferred at all —
 * `contains_minor` (drafted here, confirmed by a person) and
 * `resolution_class` (needs the orientation sampler, §5.3).
 */

import {
  ARTIFACT_PATTERNS, BRAND_RULES, DOMINANT_KIND, EVENTS, FAMILY, FILMS,
  KIND_MAP, KNOWN_PEOPLE, LOCATIONS, MERGE_UPWARD_PATTERNS, MINOR_HINTS,
  CREW_PATTERNS, RIGHTS_PATTERNS,
  MINOR_SUBJECTS, OCCASIONS, PERSON_STOPWORDS, STAGE_WORDS,
} from "./vocab.mjs";

// ── Text helpers ────────────────────────────────────────────────────────

/** Folder names arrive HTML-escaped from Drive's embeddedfolderview. */
export function decodeName(s) {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** TereZa is always spelled with a capital Z — everywhere, including metadata
 *  and alt text. Applied to every string we emit, as the last step. */
export function tereZa(s) {
  return String(s ?? "").replace(/\bTereza\b/g, "TereZa").replace(/\bTEREZA\b/g, "TereZa");
}

/**
 * The match surface for a path.
 *
 * Underscores and dots MUST become spaces before any `\b`-anchored pattern
 * runs. `_` is a word character, so /\bfamily\b/ does not match
 * "A_Cam_1_Lolli_Family_Opening" — which silently suppressed the child-safety
 * flag on every underscore-named folder in the library. That is exactly the
 * unrecoverable false negative §9.1 warns about, so it is fixed here once, for
 * every derivation, rather than per-pattern.
 */
export const hay = (path) =>
  (Array.isArray(path) ? path.join(" / ") : String(path ?? ""))
    .replace(/[_.]+/g, " ")
    .replace(/\s{2,}/g, " ");

const norm = (s) => decodeName(hay(s)).toLowerCase();

/** Strip the client's ordinal prefixes: "20. ", "1. ", "03. ". */
const stripOrdinal = (s) => decodeName(s).replace(/^\s*\d{1,3}\s*[.)-]\s*/, "");

/** Remove date tokens so what remains is the subject. */
const stripDates = (s) =>
  s
    .replace(/\d{1,2}[/.\-]\d{1,2}\s*[-–]\s*\d{1,2}[/.\-]\d{1,2}(?:\s*['’]?\d{2,4})?/g, "")
    .replace(/\d{1,2}[/.\-]\d{1,2}\s*[-–]\s*\d{1,2}(?:[/.\-]\d{2,4})?/g, "")
    .replace(/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/g, "")
    .replace(/['’]\d{2}\b/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "");

/** Drop production-stage words from a candidate title. */
function stripStageWords(s) {
  const words = s.split(/\s+/).filter(Boolean);
  const kept = words.filter((w) => !STAGE_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
  return (kept.length ? kept : words).join(" ");
}

const tidy = (s) =>
  s.replace(/[\s\-–_&]+$/g, "").replace(/^[\s\-–_&]+/g, "").replace(/\s{2,}/g, " ").trim();

// ── Dates ───────────────────────────────────────────────────────────────

const yr = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n < 100 ? 2000 + n : n;
};
/** Returns null for anything that is not a real calendar date. A caller that
 *  gets null must fall through to the next pattern rather than emit it. */
const iso = (y, m, d) => {
  const Y = Number(y), M = Number(m), D = Number(d);
  if (!Y || !M || !D) return null;
  if (M < 1 || M > 12 || D < 1 || D > 31) return null;
  return `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`;
};

/**
 * The client writes dates eleven different ways. Measured across Tier A:
 *   12/15/2024 · 1/20/2025 · 01/27/26 · 05.08.26 · 12-24-24
 *   11/13-15/2025 · 03.19-20 '26 · 11/07 - 11/09 '24 · 01/05 - 01/06 2026
 * Returns {start, end} ISO strings; end is null for a single day.
 */
export function parseDate(text) {
  const s = decodeName(text);

  /**
   * Order matters, and validation is what makes the order safe.
   *
   * Cross-month first: "11/07 - 11/09 '24" and "01/05 - 01/06 2026" are only
   * read correctly by the five-group pattern — the within-month pattern eats
   * the second date's DAY as the year and yields 2009 / 2006.
   *
   * That was unsafe until iso() started rejecting impossible dates. Given
   * "11/13-15/2025" this pattern reads 15 as a month, iso() returns null, and
   * we fall through to the within-month reading instead of emitting
   * "2025-15-20" — the malformed value that failed 64 imports.
   */
  let m = /(\d{1,2})[/.\-](\d{1,2})\s*[-\u2013]\s*(\d{1,2})[/.\-](\d{1,2})\s*['\u2019]?(\d{2,4})/.exec(s);
  if (m) {
    const y = yr(m[5]);
    const start = iso(y, m[1], m[2]);
    const end = iso(y, m[3], m[4]);
    if (start && end) return { start, end };
  }

  // MM/DD-DD/YYYY — a range within one month, e.g. "11/13-15/2025".
  m = /(\d{1,2})[/.\-](\d{1,2})\s*[-\u2013]\s*(\d{1,2})[/.\-\s]+['\u2019]?(\d{2,4})\b/.exec(s);
  if (m) {
    const y = yr(m[4]);
    const start = iso(y, m[1], m[2]);
    const end = iso(y, m[1], m[3]);
    if (start && end) return { start, end };
  }

  // MM/DD/YYYY  |  MM.DD.YY  |  MM-DD-YY
  m = /(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/.exec(s);
  if (m) {
    const y = yr(m[3]);
    // Guard against reading a resolution or a count as a date.
    if (y >= 2015 && y <= 2035 && +m[1] <= 12 && +m[2] <= 31) {
      return { start: iso(y, m[1], m[2]), end: null };
    }
  }

  // A bare year, last resort.
  m = /\b(20[1-3]\d)\b/.exec(s);
  if (m) return { start: `${m[1]}-01-01`, end: null, yearOnly: true };

  return { start: null, end: null };
}

/** Walk the path root→leaf and take the first date found. Ancestors carry the
 *  event date; leaves carry stage names. */
export function deriveDate(path) {
  for (const seg of path) {
    const d = parseDate(seg);
    if (d.start) return d;
  }
  return { start: null, end: null };
}

// ── Controlled-list matching ────────────────────────────────────────────

const matchList = (haystack, list) => {
  const h = norm(haystack);
  for (const item of list) {
    const pats = item.match ?? item.aliases.map((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
    if (pats.some((p) => p.test(h))) return item;
  }
  return null;
};

export const deriveFilm = (path) => matchList(hay(path), FILMS);
export const deriveEvent = (path) => matchList(hay(path), EVENTS);
export const deriveLocation = (path) => matchList(hay(path), LOCATIONS);

export function deriveOccasion(path) {
  const h = hay(path);
  for (const o of OCCASIONS) if (o.match.some((p) => p.test(h))) return o;
  /**
   * An explicit bucket, not null.
   *
   * 378 of 559 entries had no occasion and therefore vanished from the facet
   * entirely — two thirds of the catalog was unreachable by that axis and a
   * reader had no way to know it existed. "Unspecified" is honest and, more
   * usefully, selectable.
   */
  return { slug: "unspecified", label: "Unspecified" };
}

// ── People ──────────────────────────────────────────────────────────────

/** Family members named anywhere in the path. */
export function deriveSubjects(path) {
  const h = hay(path);
  return FAMILY.filter((f) => f.match.some((p) => p.test(h))).map((f) => f.slug);
}

/**
 * Named guests. Two sources: the `Dr. X Y` pattern, which the library is full
 * of (138 distinct across Tier A), and a curated list for the guests who are
 * not doctors. Trailing stage words are trimmed — "Dr. Pompa RAW" is Dr. Pompa.
 */
export function derivePeople(path) {
  const out = new Set();
  const h = hay(path);

  for (const raw of h.match(/Dr\.?\s+[A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+)?/g) ?? []) {
    let name = decodeName(raw).replace(/\s+/g, " ").trim();
    // Trim a trailing stage word that the regex swallowed.
    const parts = name.split(" ");
    const last = parts.at(-1);
    if (last && (STAGE_WORDS.includes(last.toLowerCase()) || PERSON_STOPWORDS.has(last))) {
      parts.pop();
      name = parts.join(" ");
    }
    name = name.replace(/^Dr\.?\s*/, "Dr. ");
    if (name.replace(/^Dr\.\s*/, "").length > 2) out.add(name);
  }

  for (const known of KNOWN_PEOPLE) {
    if (PERSON_STOPWORDS.has(known)) continue;
    if (new RegExp(`\\b${known.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(h)) out.add(known);
  }

  return [...out];
}

/**
 * Split the people found in a path by the ROLE the path assigns them.
 *
 * Returns { featured, crew, rights }. A name is only "featured" — i.e. a claim
 * that they are in the frame — when nothing in the path says otherwise. That
 * is the conservative direction: over-crediting someone as a subject is a
 * reputational error, under-crediting them is a gap a person can fill in.
 */
export function classifyPeople(path, names) {
  const h = hay(path);
  const roleOf = (patterns) => {
    const found = new Set();
    for (const re of patterns) {
      re.lastIndex = 0;
      for (const m of h.matchAll(re)) if (m[1]) found.add(m[1].toLowerCase().trim());
    }
    return found;
  };

  const crewNames = roleOf(CREW_PATTERNS);
  const rightsNames = roleOf(RIGHTS_PATTERNS);

  const featured = [];
  const crew = [];
  const rights = [];

  for (const name of names) {
    // Compare on the bare name, so "Dr. Bruce Werber" matches a capture of
    // "Bruce Werber".
    const bare = name.replace(/^Dr\.?\s*/i, "").toLowerCase().trim();
    const hit = (set) =>
      set.has(bare) || [...set].some((n) => n === bare || bare.endsWith(n) || n.endsWith(bare));

    if (hit(rightsNames)) rights.push(name);
    else if (hit(crewNames)) crew.push(name);
    else featured.push(name);
  }
  return { featured, crew, rights };
}

// ── Child safety ────────────────────────────────────────────────────────

/**
 * DRAFT flag only. Love and Legend Lolli are children and appear throughout
 * the library; a person confirms every flag before publish (§9.1). Deliberately
 * over-inclusive — "family" and "kids" trip it even with no name — because a
 * false negative publishes a child's image unflagged and is not recoverable.
 */
export function deriveContainsMinor(path, subjects) {
  if (subjects.some((s) => MINOR_SUBJECTS.includes(s))) return true;
  const h = hay(path);
  return MINOR_HINTS.some((p) => p.test(h));
}

/**
 * How urgently a human must look at this entry for the child-safety question.
 *
 * Measured reality: across the 486 publishable entries, "love" and "legend"
 * appear in 4 folder names each and "kids" in 1. The build plan says the two
 * children "appear throughout the library" — and both statements are true.
 * They are in the CONTENT; the folder NAMES simply do not say so, and §7.4
 * establishes that the path is the only signal we have.
 *
 * So a binary flag drafted from paths under-reports badly, and shipping it
 * alone would give a reviewer false confidence that the unflagged 476 are
 * clear. This grades instead:
 *
 *   named   — a child is named, or a kids/family hint fires. Review first.
 *   context — a setting the family attends together (a premiere, a red
 *             carpet, a Lolli-named shoot, or a parent already identified).
 *             Children are plausible and unnamed. Review these too.
 *   none    — no signal either way. NOT a clearance: it means the path told
 *             us nothing, which is the normal case.
 *
 * Nothing publishes on this field alone (§9.1).
 */
export function deriveMinorRisk(path, subjects, occasion, contains_minor) {
  if (contains_minor) return "named";
  const h = hay(path);
  const familyContext =
    /\blolli\b/i.test(h) ||
    subjects.includes("anthony") ||
    subjects.includes("tereza") ||
    ["premiere", "festival", "book-signing"].includes(occasion?.slug ?? "");
  return familyContext ? "context" : "none";
}

// ── Kind ────────────────────────────────────────────────────────────────

export function deriveKind(auditKind, dominant, path) {
  const h = hay(path);
  // Magazine work is unmistakable and outranks the folder's media mix.
  if (/issue\s*#|magazine/i.test(h)) return "magazine";

  const mapped = KIND_MAP[auditKind];
  if (mapped && mapped !== "byDominant") return mapped;
  return DOMINANT_KIND[dominant] ?? "b-roll";
}

/** Magazine issue number, when the path names one. */
export function deriveIssue(path) {
  const m = /issue\s*#?\s*(\d{1,2})/i.exec(hay(path));
  return m ? Number(m[1]) : null;
}

// ── Brand ───────────────────────────────────────────────────────────────

export function deriveBrand(path) {
  const h = hay(path);
  for (const rule of BRAND_RULES) if (rule.match.some((p) => p.test(h))) return rule.brand;
  return "lolli-brands";
}

// ── Publication eligibility ─────────────────────────────────────────────

/**
 * Three dispositions, not two.
 *
 *   reject  — machine output (NLE bundles, caches, camera roots). Never
 *             publishable; the "content" is a render cache.
 *   merge   — real content at the wrong granularity (per-camera raw dumps,
 *             ARCHIVE copies). Belongs inside its parent's entry, not as its
 *             own row.
 *   publish — clears both, and has a human-legible name (§4.4 rule 1).
 *
 * The audit promoted 73 rows to Tier A that fail these — including a
 * 2,118-file Lightroom preview cache. Silent publication of those is the
 * failure this prevents.
 */
export function eligibility(path) {
  for (const seg of path) {
    const bad = ARTIFACT_PATTERNS.find((p) => p.test(seg));
    if (bad) return { disposition: "reject", reason: `machine artifact: ${seg}` };
  }
  const leaf = path.at(-1) ?? "";
  const merge = MERGE_UPWARD_PATTERNS.find((p) => p.test(leaf));
  if (merge) return { disposition: "merge", reason: `wrong granularity: ${leaf}` };

  // A name that is only digits, or that vanishes once stage words go, names
  // nothing to a stranger.
  const bare = tidy(stripStageWords(stripDates(stripOrdinal(leaf))));
  if (!bare || bare.length < 3) {
    return { disposition: "merge", reason: `no subject left after stage-strip: ${leaf}` };
  }
  return { disposition: "publish", reason: null };
}

// ── Title ───────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/**
 * Rename for strangers. §4.5 rule 6 calls this renaming "the product":
 *   "6. 6/26/2025 - UFC/ Aires Tech RoundTable - Vegas"
 *   → "UFC × Aires Tech Roundtable — Las Vegas, June 2025"
 *
 * Built from the most specific meaningful ancestor, then qualified by what the
 * entry actually is and when. Never emits a bare `CARD 1` or `Dump 1`.
 */
export function buildTitle({ collection, path, film, event, location, date, kind, occasion, issue }) {
  // Prefer the audit's rolled-up subject; fall back to the cleanest ancestor.
  let base = tidy(stripStageWords(stripDates(stripOrdinal(collection || ""))));
  if (!base || base.length < 3) {
    for (let i = path.length - 1; i >= 0; i--) {
      const c = tidy(stripStageWords(stripDates(stripOrdinal(path[i]))));
      if (c.length >= 3) { base = c; break; }
    }
  }
  if (!base) base = "Untitled collection";

  // Prefer the named event or film when the folder name is thinner than it.
  if (event && !new RegExp(event.title.slice(0, 12), "i").test(base)) {
    base = base.length < 6 ? event.title : `${event.title} — ${base}`;
  } else if (film && !new RegExp(film.title.slice(0, 8), "i").test(base) && base.length < 6) {
    base = film.title;
  }

  const bits = [tidy(base)];

  if (issue) bits.push(`Issue #${issue}`);

  // What it is, when the title does not already say.
  // "Unspecified" is a facet bucket, never a title. Without this guard every
  // untagged collection would read "Something — Unspecified".
  const namedOccasion = occasion && occasion.slug !== "unspecified" ? occasion : null;
  const qualifier =
    namedOccasion && !new RegExp(namedOccasion.label.split(" ")[0], "i").test(base)
      ? namedOccasion.label
      : KIND_QUALIFIER[kind];
  if (qualifier && !new RegExp(qualifier.split(" ")[0], "i").test(base)) bits.push(qualifier);

  let title = bits.join(" — ");

  if (location && !new RegExp(location.label.split(",")[0], "i").test(title)) {
    title += `, ${location.label}`;
  }

  if (date?.start) {
    const [y, m] = date.start.split("-");
    const stamp = date.yearOnly ? y : `${MONTHS[Number(m) - 1]} ${y}`;
    if (!new RegExp(`\\b${y}\\b`).test(title)) title += `, ${stamp}`;
  }

  return tereZa(tidy(title));
}

const KIND_QUALIFIER = {
  "event photography": "Event Photography",
  "b-roll": "B-Roll",
  BTS: "Behind the Scenes",
  headshots: "Headshots",
  poster: "Key Art",
  logo: "Logos",
  trailer: "Trailer",
  magazine: "Magazine",
  press: "Press",
  document: "Documents",
  interview: "Interviews",
  audio: "Audio",
  podcast: "Podcast",
};

// ── Description ─────────────────────────────────────────────────────────

const nf = (n) => Number(n || 0).toLocaleString("en-US");

/**
 * One line, human, factual. Says what is inside and where it came from, so a
 * journalist can decide whether to click without opening Drive.
 *
 * Written from counts we measured, never from adjectives we invented.
 */
export function buildDescription({ files, mix, kind, film, event, location, date, people, subjects }) {
  const parts = [];

  const shape = [];
  if (mix.image) shape.push(`${nf(mix.image)} image${mix.image === 1 ? "" : "s"}`);
  if (mix.video) shape.push(`${nf(mix.video)} video${mix.video === 1 ? "" : "s"}`);
  if (mix.document) shape.push(`${nf(mix.document)} document${mix.document === 1 ? "" : "s"}`);
  if (mix.audio) shape.push(`${nf(mix.audio)} audio file${mix.audio === 1 ? "" : "s"}`);
  if (mix.vector) shape.push(`${nf(mix.vector)} vector file${mix.vector === 1 ? "" : "s"}`);
  if (!shape.length) shape.push(`${nf(files)} files`);

  const label = {
    "event photography": "Event photography",
    "b-roll": "B-roll",
    BTS: "Behind-the-scenes coverage",
    headshots: "Headshots",
    poster: "Key art",
    logo: "Logo and wordmark files",
    trailer: "Trailer material",
    magazine: "Magazine production files",
    press: "Press material",
    document: "Documents",
    interview: "Interview footage",
    audio: "Audio",
    podcast: "Podcast material",
  }[kind] ?? "Media";

  parts.push(`${label} — ${shape.join(", ")}`);

  const context = [];
  if (event) context.push(`from ${event.title}`);
  else if (film) context.push(`from ${film.title}`);
  if (location) context.push(`in ${location.label}`);
  if (date?.start && !date.yearOnly) {
    const [y, m, d] = date.start.split("-");
    context.push(`shot ${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`);
  } else if (date?.start) {
    context.push(`from ${date.start.slice(0, 4)}`);
  }
  if (context.length) parts.push(context.join(" "));

  const who = [
    ...subjects.map((s) => FAMILY.find((f) => f.slug === s)?.label).filter(Boolean),
    ...people.slice(0, 3),
  ];
  if (who.length) parts.push(`Featuring ${who.slice(0, 4).join(", ")}`);

  // Each clause is its own sentence, so each starts with a capital.
  const sentences = parts.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
  return tereZa(`${sentences.join(". ")}.`);
}

export { stripOrdinal, stripDates, stripStageWords, tidy, MONTHS };
