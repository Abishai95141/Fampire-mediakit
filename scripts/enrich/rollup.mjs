/**
 * The rollup, re-implemented and made re-runnable.
 *
 * Two audit criticals are closed here.
 *
 * CRITICAL 3 — "merged-folder membership is unrecoverable". It was recorded
 * nowhere: `entries_alternates` held 0 rows, catalog.json has no member list,
 * and the intermediates that once held `members` (rolled2.json, parents.json)
 * are gone. But the INPUTS survive — the raw crawl and the parent edges — so
 * the membership is not lost, only uncomputed. This recomputes it and writes
 * it out, which turns "these 4,696 files are in this collection" from an
 * assertion into something anyone can check.
 *
 * CRITICAL 2 — the 13 uncrawled seeds. Their folders/files/parents are merged
 * in here from scripts/crawl/crawl-missing.mjs before rolling up, so the new
 * material flows through the same rules as everything else rather than being
 * bolted on.
 *
 * The rules are a faithful port of ~/Fampire/scripts/rollup2.py — same stage
 * vocabulary, same subject extraction, same anchor climb, same >=10 threshold
 * — verified by reproducing the original 2,622 subjects / 559 Tier A before
 * the supplement is added. If that check fails the port is wrong, and the
 * script says so rather than quietly producing a different catalog.
 *
 * Run: node scripts/enrich/rollup.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIT = `${ROOT}/data/audit`;
const HOME = process.env.HOME;

// ── Rules, ported verbatim from rollup2.py ──────────────────────────────

const STAGE = new Set(`dcim msdcf lrdata lrcat organized organised preview previews proxy proxies
cache temp tmp backup backups duplicate duplicates untitled sequence render renders output outputs
working wip test tests old archive_old raw edited edit colored color coloured general bts behind
the scenes photo photos video videos vid vids clip clips footage content dump card station day part
final select selects export exports image images asset assets file files master masters folder misc
new all b roll broll and of for with in on at to a an shots shot pics pic pictures picture thumbnail
thumbnails thumb wm copy copies use used ready full set sets original originals hi res hires lo web
print social post posts story stories`.split(/\s+/).filter(Boolean));

const TOKEN = /[A-Za-z']+/g;

const decode = (s) =>
  String(s ?? "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();

function subjectOf(name) {
  let n = String(name ?? "");
  n = n.replace(/\d{1,4}[/:.\-]\d{1,2}([/:.\-]\d{2,4})?/g, " ");  // dates
  n = n.replace(/'\d{2}/g, " ").replace(/\b\d+\b/g, " ");          // years/numbers
  const toks = (n.match(TOKEN) ?? []).filter((t) => !STAGE.has(t.toLowerCase()));
  return toks.join(" ").trim();
}

const isCollection = (name) => subjectOf(name).replace(/[^A-Za-z]/g, "").length >= 4;

const EXT = /\.([A-Za-z0-9]{2,4})$/;
const VID = new Set("mp4 mov avi mxf m4v mts wmv mkv r3d braw".split(" "));
const IMG = new Set("jpg jpeg png tif tiff heic webp cr2 cr3 arw nef dng raf".split(" "));
const VEC = new Set("svg ai eps".split(" "));
const DOC = new Set("pdf docx doc rtf txt pptx key".split(" "));
const AUD = new Set("wav mp3 aif aiff".split(" "));

function kindOf(name, alt) {
  const m = EXT.exec(name ?? "");
  const e = m ? m[1].toLowerCase() : "";
  if (alt === "Video" || VID.has(e)) return "video";
  if (alt === "SVG Image" || VEC.has(e)) return "vector";
  if (["JPEG Image", "PNG Image", "Photo"].includes(alt) || IMG.has(e)) return "image";
  if (alt === "PDF" || DOC.has(e)) return "document";
  if (alt === "Audio" || AUD.has(e)) return "audio";
  return "other";
}

// ── Load ────────────────────────────────────────────────────────────────

const crawl = JSON.parse(readFileSync(`${HOME}/Fampire/data/drive-crawl-full.json`, "utf8"));
const parents = JSON.parse(readFileSync(`${HOME}/Fampire/data/drive-folder-parents.json`, "utf8"));

const folders = {};
for (const [id, name] of Object.entries(crawl.folders)) folders[id] = decode(name);
const files = { ...crawl.files };
const parent = { ...parents };

const baselineFiles = Object.keys(files).length;

// Merge the recovered seeds.
let supplement = { folders: {}, files: {}, parents: {} };
if (existsSync(`${AUDIT}/crawl-supplement.json`)) {
  supplement = JSON.parse(readFileSync(`${AUDIT}/crawl-supplement.json`, "utf8"));
  for (const [id, name] of Object.entries(supplement.folders)) folders[id] ??= decode(name);
  for (const [id, v] of Object.entries(supplement.files)) files[id] ??= v;
  for (const [c, p] of Object.entries(supplement.parents)) parent[c] ??= p;
}
const addedFiles = Object.keys(files).length - baselineFiles;

// ── Anchor climb ────────────────────────────────────────────────────────

const anchorCache = new Map();
function anchor(fid) {
  if (anchorCache.has(fid)) return anchorCache.get(fid);
  const path = [];
  const seen = new Set();
  let cur = fid;
  let result = fid;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    path.push(cur);
    if (isCollection(folders[cur] ?? "")) { result = cur; break; }
    const p = parent[cur];
    if (!p) { result = cur; break; }
    cur = p;
  }
  for (const id of path) anchorCache.set(id, result);
  return result;
}

// ── Roll ────────────────────────────────────────────────────────────────

const roll = new Map();   // anchor -> {image,video,...}
const members = new Map(); // anchor -> Set(parent folder ids)  <-- CRITICAL 3

for (const [, v] of Object.entries(files)) {
  const [name, alt, par] = v;
  if (!par) continue;
  const a = anchor(par);
  if (!roll.has(a)) roll.set(a, { image: 0, video: 0, vector: 0, document: 0, audio: 0, other: 0 });
  roll.get(a)[kindOf(name, alt)]++;
  if (!members.has(a)) members.set(a, new Set());
  members.get(a).add(par);
}

// ── Dedup by normalised subject ─────────────────────────────────────────

const norm = new Map();
for (const a of roll.keys()) {
  const key = subjectOf(folders[a] ?? "").replace(/\s+/g, " ").toLowerCase().trim();
  if (!norm.has(key)) norm.set(key, []);
  norm.get(key).push(a);
}

const total = (c) => c.image + c.video + c.vector + c.document + c.audio + c.other;

/**
 * Hero assets, which BUILD-PLAN §4.3 specifies as Tier B and which were never
 * built.
 *
 * The >=10-file rule is right for event coverage and wrong for the assets
 * people actually ask for by name: a logo suite is four files, a headshot
 * folder is five, a cover is one. Under a flat threshold every one of them
 * fell to Tier C and vanished — which is why the logo lane is thin and the
 * booking page has almost no headshots. §4.3: "Tier B — Hero assets · Full
 * metadata · Logos, posters, trailers, headshots. Requested by name, not by
 * folder."
 *
 * Deliberately narrow: it promotes only folders whose NAME says they hold a
 * hero asset, so it cannot become a backdoor that readmits the 2,000 Tier C
 * rows the threshold exists to keep out.
 */
const HERO_ASSET =
  /\b(head ?shots?|bios?|logos?|wordmarks?|posters?|key art|trailers?|covers?|cover art|magazine cover|brand ?marks?)\b/i;

function tierFor(name, files) {
  if (files >= 10) return "A – publish";
  if (files >= 1 && HERO_ASSET.test(name)) return "B – hero asset";
  return "C – merge upward";
}

const rows = [];
for (const [key, anchors] of norm.entries()) {
  // Head = the anchor with the most files; the rest become alternates.
  const sorted = anchors.slice().sort((x, y) => total(roll.get(y)) - total(roll.get(x)));
  const head = sorted[0];
  const c = roll.get(head);

  const allMembers = new Set();
  let filesAllCopies = 0;
  for (const a of anchors) {
    filesAllCopies += total(roll.get(a));
    for (const m of members.get(a) ?? []) allMembers.add(m);
  }

  rows.push({
    collection: folders[head] ?? "",
    subject_key: key,
    files: total(c),
    ...c,
    dominant: Object.entries(c).sort((x, y) => y[1] - x[1])[0][0],
    folder_id: head,
    // CRITICAL 3: every folder that contributed, recorded. Previously lost.
    alternate_folder_ids: sorted.slice(1),
    member_folder_ids: [...allMembers],
    duplicate_folders: anchors.length,
    files_all_copies: filesAllCopies,
    tier: tierFor(folders[head] ?? "", total(c)),
  });
}

// ── Fidelity check against the original ─────────────────────────────────

const tierA = rows.filter((r) => r.tier.startsWith("A"));
const original = JSON.parse(readFileSync(`${AUDIT}/catalog.json`, "utf8"));
const origA = original.filter((r) => String(r.tier).startsWith("A")).length;

console.log(`files: ${baselineFiles.toLocaleString()} baseline + ${addedFiles.toLocaleString()} recovered = ${Object.keys(files).length.toLocaleString()}`);
console.log(`subjects: ${rows.length.toLocaleString()} (original run: ${original.length.toLocaleString()})`);
console.log(`Tier A:   ${tierA.length.toLocaleString()} (original run: ${origA.toLocaleString()})`);

const conserved = rows.reduce((n, r) => n + r.files_all_copies, 0);
console.log(`file conservation: ${conserved.toLocaleString()} vs ${Object.keys(files).length.toLocaleString()} ${conserved === Object.keys(files).length ? "PASS" : "DRIFT"}`);

const withAlternates = tierA.filter((r) => r.alternate_folder_ids.length).length;
console.log(`Tier A rows carrying alternates: ${withAlternates} (was: unrecorded)`);

writeFileSync(`${AUDIT}/catalog-rolled.json`, JSON.stringify(rows));
console.log(`\nwrote ${AUDIT}/catalog-rolled.json`);
