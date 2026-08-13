/**
 * Build the enriched 559-entry catalog.
 *
 * Input:  data/audit/{catalog.json, drive-folders.json, drive-folder-parents.json}
 * Output: data/fampire/entries.json       — the full enriched catalog
 *         data/fampire/entries-review.csv — for client sign-off (§5.4)
 *         data/fampire/entries-held.csv   — what did NOT qualify, and why
 *
 * Enrichment is verification, not authoring. Every field here is derived from
 * the folder path and is reviewable; nothing is invented. Two fields stay
 * unset on purpose: `resolution_class` needs the orientation sampler (§5.3),
 * and `contains_minor_confirmed` needs a person (§9.1).
 *
 * Run: node scripts/enrich/build-entries.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDescription, buildTitle, decodeName, deriveBrand, deriveContainsMinor,
  deriveDate, deriveEvent, deriveFilm, deriveIssue, deriveKind, deriveLocation,
  classifyPeople,
  deriveMinorRisk, deriveOccasion, derivePeople, deriveSubjects, eligibility,
} from "./derive.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIT = `${ROOT}/data/audit`;
const OUT = `${ROOT}/data/fampire`;

const read = (f) => JSON.parse(readFileSync(`${AUDIT}/${f}`, "utf8"));
/**
 * Prefer the re-runnable rollup when it exists.
 *
 * `catalog-rolled.json` is produced by scripts/enrich/rollup.mjs, which
 * recovers two things the original pass lost: the folders recovered from the
 * 13 uncrawled seeds, and — critically — `alternate_folder_ids`, the other
 * folders that were merged into each subject. Without those the catalog
 * claimed 125,170 files while linking only 87,426 of them, which is the
 * audit's headline defect.
 *
 * Falls back to the original snapshot so the build still runs on a machine
 * where the rollup has not been executed.
 */
const rolled = (() => {
  try {
    const rows = read("catalog-rolled.json");
    // Carry the original audit `kind` forward where the same folder anchored a
    // row before — it encodes judgements the rollup itself does not make.
    const prior = new Map(
      read("catalog.json")
        .map((r) => [(/\/folders\/([^/?#]+)/.exec(r.url || "") ?? [])[1], r])
        .filter(([k]) => k),
    );
    return rows.map((r) => {
      const before = prior.get(r.folder_id);
      return {
        ...r,
        url: `https://drive.google.com/drive/folders/${r.folder_id}`,
        raw_folder_name: r.collection,
        kind: before?.kind ?? "",
        people: before?.people ?? "",
        film: before?.film ?? "",
        year: before?.year ?? "",
        source: "Google Drive",
      };
    });
  } catch {
    return null;
  }
})();

const catalog = rolled ?? read("catalog.json");
console.log(rolled ? `using catalog-rolled.json (${rolled.length} subjects)` : "using catalog.json (original snapshot)");

/**
 * Orientation, measured by scripts/enrich/sample-orientation.mjs.
 *
 * Optional: the catalog builds without it, entries just carry a null
 * orientation and an editor cannot filter for vertical. Re-run the sampler
 * then re-run this to fill them in.
 */
let orientation = {};
try {
  orientation = JSON.parse(readFileSync(`${OUT}/orientation.json`, "utf8")).sampled ?? {};
} catch {
  console.log("no orientation.json — run scripts/enrich/sample-orientation.mjs first");
}
const folders = read("drive-folders.json");
const parents = read("drive-folder-parents.json");

// ── Ancestry ────────────────────────────────────────────────────────────

const folderIdOf = (url) => (/\/folders\/([^/?#]+)/.exec(url || "") ?? [])[1] ?? null;

/** root → leaf. Cycle-guarded: a malformed parent edge must not hang the build. */
function ancestry(id) {
  const out = [];
  const seen = new Set();
  let cur = id;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (folders[cur] !== undefined) out.push(decodeName(folders[cur]));
    cur = parents[cur];
  }
  return out.reverse();
}

/**
 * Canonicalise account-scoped Drive URLs. `/drive/u/N/folders/...` encodes the
 * signed-in account POSITION in the exporter's browser, not the folder — it
 * breaks unpredictably for everyone else (§7.8). The audit's 559 are already
 * canonical; this keeps that true for anything added later.
 */
function normalizeUrl(raw) {
  if (!raw) return { url: null, rewritten_from: null };
  let url = raw;
  const scoped = /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([^?#]+)/.exec(url);
  if (scoped) url = `https://drive.google.com/drive/folders/${scoped[1]}`;
  const openId = /^https:\/\/drive\.google\.com\/open\?id=([^&#]+)/.exec(url);
  if (openId) url = `https://drive.google.com/drive/folders/${openId[1]}`;
  url = url.replace(/[?&](usp|subfolder_nav_tracking|srsltid)=[^&#]*/g, "");
  url = url.replace(/\?&/, "?").replace(/[?&]$/, "");
  return { url, rewritten_from: url === raw ? null : raw };
}

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// ── Build ───────────────────────────────────────────────────────────────

// Tier A (collections) AND Tier B (hero assets — logos, headshots, posters,
// trailers, covers). §4.3 specifies both; only A was ever built.
const tierA = catalog.filter((r) => /^[AB]/.test(String(r.tier)));
const seenIds = new Set();
const entries = [];

for (const row of tierA) {
  const folder_id = folderIdOf(row.url);
  const path = folder_id ? ancestry(folder_id) : [];
  const { url, rewritten_from } = normalizeUrl(row.url);

  const mix = {
    image: row.image || 0, video: row.video || 0, vector: row.vector || 0,
    document: row.document || 0, audio: row.audio || 0, other: row.other || 0,
  };

  const film = deriveFilm(path);
  const event = deriveEvent(path);
  const location = deriveLocation(path);
  const occasion = deriveOccasion(path);
  const date = deriveDate(path);
  const rawSubjects = deriveSubjects(path);
  const allNames = derivePeople(path);

  /**
   * Child safety is computed from the RAW subjects, before any attribution
   * reclassification can remove someone. An attribution fix must never be able
   * to weaken the §9.1 gate as a side effect.
   */
  const containsMinorRaw = deriveContainsMinor(path, rawSubjects);

  /**
   * Family members are classified too, not just guests.
   *
   * 78 of TereZa's 85 credits came from "owned by TereZa" (a rights label) or
   * "TereZa Cell footage" (whose phone shot it) — neither says she is in the
   * frame. Classifying only the guest names left the larger half of the
   * over-attribution in place.
   */
  const FAMILY_NAMES = { anthony: "Anthony Lolli", tereza: "TereZa", love: "Love Lolli", legend: "Legend Lolli" };
  const famAsNames = rawSubjects.map((sl) => FAMILY_NAMES[sl] ?? sl);
  const famSplit = classifyPeople(path, famAsNames);
  const backToSlug = (n) => Object.keys(FAMILY_NAMES).find((k) => FAMILY_NAMES[k] === n) ?? n;

  const subjects = famSplit.featured.map(backToSlug);
  const { featured: people, crew: guestCrew, rights: guestRights } = classifyPeople(path, allNames);
  const crew = [...guestCrew, ...famSplit.crew];
  const rights = [...guestRights, ...famSplit.rights];
  const kind = deriveKind(row.kind, row.dominant, path);
  const issue = deriveIssue(path);
  const brand = deriveBrand(path);
  const { disposition, reason } = eligibility(path);
  // Raw, so reclassification cannot weaken the gate.
  const contains_minor = containsMinorRaw;
  const minor_risk = deriveMinorRisk(path, rawSubjects, occasion, contains_minor);

  const title = buildTitle({
    collection: row.collection, path, film, event, location, date, kind, occasion, issue,
  });

  const description = buildDescription({
    files: row.files, mix, kind, film, event, location, date, people, subjects,
  });

  // Stable, readable, unique.
  let id = slugify(`${kind}-${title}`) || `entry-${folder_id}`;
  if (seenIds.has(id)) id = `${id}-${folder_id.slice(0, 6).toLowerCase()}`;
  seenIds.add(id);

  entries.push({
    id,
    // `id` is already a readable, unique, URL-safe string built from kind and
    // title — so it is the slug. Keeping them the same means a re-import can
    // never silently move a URL someone has shared.
    slug: id,
    preview_file_id: orientation[folder_id]?.previewFileId ?? null,
    title,
    description,
    url,
    rewritten_from,
    // Every other folder merged into this subject. Previously dropped, which
    // is why the coverage claim could not be checked.
    alternates: (row.alternate_folder_ids ?? []).map(
      (id) => `https://drive.google.com/drive/folders/${id}`,
    ),
    preview: null,

    source_platform: "drive",
    access: "public",
    // Nothing publishes until a human signs it off. `publish` here means
    // "qualifies for review", not "is live" — see §9.1 and §8.
    visibility: disposition === "publish" ? "public" : "private",
    status: "unchecked",
    status_detail: null,
    last_checked: null,

    // ── Facets ──────────────────────────────────────────────────────────
    kind,
    occasion: occasion?.slug ?? null,
    occasion_label: occasion?.label ?? null,
    subjects,
    people,
    crew,
    rights_holders: rights,
    brands: [brand],
    film: film?.title ?? null,
    film_slug: film?.slug ?? null,
    event: event?.title ?? null,
    event_slug: event?.slug ?? null,
    location: location?.label ?? null,
    location_slug: location?.slug ?? null,
    magazine_issue: issue,

    year: date.start ? Number(date.start.slice(0, 4)) : null,
    date_start: date.start,
    date_end: date.end,

    // ── Shape ───────────────────────────────────────────────────────────
    file_count: row.files || 0,
    item_count: row.files || 0,
    media_mix: mix,
    dominant_media: row.dominant ?? null,
    files_all_copies: row.files_all_copies ?? row.files ?? 0,
    duplicate_folders: row.duplicate_folders ?? 1,

    // ── Human-only ──────────────────────────────────────────────────────
    contains_minor,
    minor_risk,
    contains_minor_confirmed: false,
    // From sampled pixels, not from the path. `null` means the sampler could
    // not read a single frame — usually a folder of camera negatives (.ARW,
    // .MXF, .TIF) that Drive will not thumbnail. It is not a claim of
    // landscape.
    orientation: orientation[folder_id]?.orientation ?? null,
    orientation_confidence: orientation[folder_id]?.confidence ?? null,
    orientation_samples: orientation[folder_id]?.samples ?? 0,
    resolution_class: null,

    // ── Provenance ──────────────────────────────────────────────────────
    folder_id,
    folder_path: path,
    raw_folder_name: decodeName(row.raw_folder_name ?? ""),
    audit_kind: row.kind ?? null,
    disposition,
    hold_reason: reason,

    image: null,
    strip: [],
    image_flat: false,
    image_source: null,
    source_page: null,
  });
}

// ── Report ──────────────────────────────────────────────────────────────

const pub = entries.filter((e) => e.disposition === "publish");
const held = entries.filter((e) => e.disposition !== "publish");
const pct = (n) => `${((n / pub.length) * 100).toFixed(0)}%`;

const covered = (f) => pub.filter(f).length;

console.log(`Tier A entries built: ${entries.length}`);
console.log(`  qualify for review : ${pub.length}`);
console.log(`  held back          : ${held.length}` +
  `  (reject ${held.filter((e) => e.disposition === "reject").length},` +
  ` merge ${held.filter((e) => e.disposition === "merge").length})`);

console.log(`\nMetadata coverage across the ${pub.length} publishable:`);
const rows = [
  ["title (non-placeholder)", covered((e) => !/^Untitled/.test(e.title))],
  ["description", covered((e) => e.description.length > 20)],
  ["kind", covered((e) => e.kind)],
  ["year", covered((e) => e.year)],
  ["exact date", covered((e) => e.date_start && !/-01-01$/.test(e.date_start))],
  ["film", covered((e) => e.film)],
  ["event", covered((e) => e.event)],
  ["occasion", covered((e) => e.occasion)],
  ["location", covered((e) => e.location)],
  ["family subject", covered((e) => e.subjects.length)],
  ["named people", covered((e) => e.people.length)],
  ["brand", covered((e) => e.brands.length)],
  ["magazine issue", covered((e) => e.magazine_issue)],
  ["orientation sampled", covered((e) => e.orientation)],
  ["orientation portrait", covered((e) => e.orientation === "portrait")],
  ["contains_minor drafted", covered((e) => e.contains_minor)],
  ["minor_risk named", covered((e) => e.minor_risk === "named")],
  ["minor_risk context", covered((e) => e.minor_risk === "context")],
];
for (const [label, n] of rows) {
  console.log(`  ${label.padEnd(26)} ${String(n).padStart(4)} / ${pub.length}  ${pct(n).padStart(5)}`);
}

const dist = (key) => {
  const m = {};
  for (const e of pub) {
    const v = e[key];
    for (const x of Array.isArray(v) ? v : [v]) if (x) m[x] = (m[x] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
console.log("\nkind:", Object.fromEntries(dist("kind")));
console.log("occasion:", Object.fromEntries(dist("occasion")));
console.log("brand:", Object.fromEntries(dist("brands")));

// ── Write ───────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });

writeFileSync(
  `${OUT}/entries.json`,
  JSON.stringify({ generated_from: "data/audit + scripts/enrich", generated_at: null, entries }, null, 2),
);

const csv = (rowsIn, cols) => {
  const esc = (v) => {
    const s = Array.isArray(v) ? v.join("; ") : v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rowsIn.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};

const REVIEW_COLS = [
  "id", "title", "description", "kind", "occasion_label", "film", "event",
  "location", "year", "date_start", "date_end", "subjects", "people", "brands",
  "magazine_issue", "orientation", "orientation_confidence", "orientation_samples",
  "contains_minor", "minor_risk", "contains_minor_confirmed", "file_count",
  "dominant_media", "duplicate_folders", "url", "raw_folder_name",
];
writeFileSync(`${OUT}/entries-review.csv`, csv(pub, REVIEW_COLS));

const HELD_COLS = ["id", "title", "disposition", "hold_reason", "file_count", "audit_kind", "url"];
writeFileSync(
  `${OUT}/entries-held.csv`,
  csv(held.map((e) => ({ ...e, folder_path: e.folder_path.join(" / ") })), [...HELD_COLS, "folder_path"]),
);

console.log(`\nwrote ${OUT}/entries.json`);
console.log(`wrote ${OUT}/entries-review.csv  (${pub.length} rows for sign-off)`);
console.log(`wrote ${OUT}/entries-held.csv    (${held.length} rows held back)`);

/**
 * TereZa is always spelled with a capital Z (§10). Fail the build rather than
 * ship a lowercase one — a silent violation is worse than a broken build.
 *
 * Scoped to the fields we AUTHOR. `folder_path` and `raw_folder_name` record
 * what the client's Drive literally contains — one of their own folders is
 * named "Tereza" — and correcting those would make the provenance trail lie
 * about what we found. They are never rendered on a public surface.
 */
const AUTHORED = [
  "title", "description", "film", "event", "location", "occasion_label", "id",
];
const leaks = [];
for (const e of entries) {
  for (const f of AUTHORED) {
    const v = e[f];
    if (typeof v === "string" && /Tereza|TEREZA/.test(v)) leaks.push(`${e.id}.${f}: ${v}`);
  }
  for (const p of e.people) if (/Tereza|TEREZA/.test(p)) leaks.push(`${e.id}.people: ${p}`);
}
if (leaks.length) {
  console.error(`\nFAIL: ${leaks.length} lowercase "Tereza" in authored fields. Hard rule §10.`);
  for (const l of leaks.slice(0, 10)) console.error(`  ${l}`);
  process.exit(1);
}

const verbatim = JSON.stringify(entries.map((e) => e.folder_path)).match(/Tereza/g)?.length ?? 0;
console.log(`\nTereZa check: 0 leaks in authored fields across ${entries.length} entries.`);
console.log(`  (${verbatim} verbatim in folder_path provenance — the client's own folder name, kept as-is)`);
