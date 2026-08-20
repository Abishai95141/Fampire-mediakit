import { writeFileSync, mkdirSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Rewrite the titles that are still just a folder name.
 *
 * "Renamed for strangers … This renaming IS the product" — the Entries
 * collection says so on the title field itself. Yet titles like
 * `VERTICAL LOCKUP LOGO — Logos`, `JPEG FILE — Event Photography` and
 * `BHYF_1225_FINAL_PDFS — Issue #3` were shipping the client's internal
 * folder naming straight onto a public press surface.
 *
 * Three rules, no invention:
 *
 *  1. SHOUTING and snake_case become Title Case. Presentation only.
 *  2. A subject made ENTIRELY of format words ("ICON", "VERTICAL",
 *     "JPEG FILE") carries no information, so it is dropped rather than
 *     dressed up.
 *  3. What replaces it is context the record ALREADY holds — its film, or
 *     failing that its brand. Both are real relationships in the database,
 *     so the new title asserts nothing that was not already true.
 *
 * Slugs are deliberately NOT touched: they are the shareable address, and
 * rewriting them would break links already sent out.
 *
 *   DRY_RUN=1 npx payload run scripts/retitle-machine-names.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const KIND_LABEL: Record<string, string> = {
  "b-roll": "B-roll", "event photography": "Event photography", headshots: "Headshots",
  poster: "Poster", logo: "Logos", trailer: "Trailer", BTS: "Behind the scenes",
  podcast: "Podcast", press: "Press", magazine: "Magazine", document: "Documents",
  interview: "Interviews", audio: "Audio",
};

/**
 * Words that describe a FILE, never a subject.
 *
 * "watermark", "with" and "without" are deliberately NOT here. Dropping them
 * turned `WITH WATERMARK` and `WITHOUT WATERMARK` into the same title on two
 * different collections — and which of the two a journalist may publish is
 * exactly the distinction that mattered.
 */
const FORMAT_WORDS = new Set([
  "icon","vertical","horizontal","portrait","landscape","square","jpeg","jpg","png","pdf","pdfs",
  "file","files","folder","for","a","an","the","show","archive",
  "lockup","logo","logos","final","raw","master","copy","copies","edit","edits","export","exports",
  "long","form","short","shorts","full","use","used","new","old","and","of","hi","res","web","print",
]);

/**
 * Spellings the house owns. TereZa's capital Z is a hard client rule and
 * sHEALed is a film title; naive Title Case rendered them "Tereza" and
 * "Shealed", i.e. misspelling the client's own work on a press page.
 */
const CANONICAL: Record<string, string> = {
  shealed: "sHEALed", tereza: "TereZa", biohack: "Biohack", lolli: "Lolli",
  bhyf: "Biohack Yourself", bhy: "Biohack Yourself",
};
/**
 * Acronyms to leave shouting. An ALLOWLIST, not a shape test: "any short
 * all-caps token is an acronym" also captured GO, WITH, LOCK, UP and FOR,
 * producing "GO sHEALed Yourself" and "Horizontal LOCK UP LOGO".
 */
const ACRONYMS = new Set([
  "MAHA","TBI","UFC","A4M","BTS","QNA","HNN","BHY","BHYF","USA","NYC","CEO","MD","PHD","DNA",
  "AI","TV","PR","VIP","LED","UV","IV","EMF","HBOT","NAD","GLP","RFK","FDA","CDC",
]);
const isAcronym = (w: string) => ACRONYMS.has(w.toUpperCase().replace(/[^A-Z0-9]/g, ""));

const titleCase = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => {
      const canon = CANONICAL[w.toLowerCase().replace(/[^a-z]/g, "")];
      if (canon) return canon;
      if (isAcronym(w)) return w;
      // Leave mixed-case spellings (sHEALed, BioHack) exactly as written.
      if (/[a-z]/.test(w) && /[A-Z]/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");

const entries = await api.find({
  collection: "entries", limit: 3000, depth: 1, overrideAccess: true, draft: true,
});

const changes: { id: number; from: string; to: string }[] = [];

for (const e of entries.docs as Record<string, unknown>[]) {
  const raw = String(e.rawFolderName ?? "").trim();
  const title = String(e.title ?? "");
  if (!raw || !title.includes(raw)) continue;
  // Machine-shaped only: underscores, SHOUTING, or a hex blob.
  if (!/(_|[A-Z]{4,}|[0-9A-F]{8,})/.test(raw)) continue;

  const kind = String(e.kind ?? "");
  const kindLabel = KIND_LABEL[kind] ?? kind;

  // Strip leading numbering ("3. ", "01 - ") and hex blobs.
  let subject = raw
    .replace(/^\s*\d+\s*[.)-]\s*/, "")
    .replace(/\b[0-9A-F]{8,}\b/gi, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = subject.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const allFormat = tokens.length > 0 && tokens.every((t) => FORMAT_WORDS.has(t) || /^\d+$/.test(t));
  if (allFormat || !tokens.length) subject = "";
  else subject = titleCase(subject);

  const film = e.film && typeof e.film === "object" ? String((e.film as { title?: string }).title ?? "") : "";
  const brand = e.tenant && typeof e.tenant === "object" ? String((e.tenant as { name?: string }).name ?? "") : "";
  const context = film || brand;
  if (!context && !subject) continue;

  // "sHEALed — sHEALed Documentary Logos" says it twice.
  const ctx = subject.toLowerCase().includes(context.toLowerCase()) ? "" : context;
  const parts = [ctx, subject, kindLabel].filter(Boolean);
  // Drop a subject that merely restates the kind ("Logos — Logos").
  const deduped = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  const next = deduped.join(" — ");
  if (!next || next === title) continue;

  changes.push({ id: e.id as number, from: title, to: next });
}

/**
 * A rename that makes two collections indistinguishable is worse than the
 * folder name it replaced — the reader can no longer tell which is which, and
 * unlike the ugly original it looks deliberate. Anything that collides is left
 * alone and listed for a human instead.
 */
const existing = new Map<string, number>();
for (const e of entries.docs as Record<string, unknown>[]) {
  const t = String(e.title ?? "");
  existing.set(t, (existing.get(t) ?? 0) + 1);
}
const proposed = new Map<string, number>();
for (const c of changes) proposed.set(c.to, (proposed.get(c.to) ?? 0) + 1);

const safe = changes.filter((c) => (proposed.get(c.to) ?? 0) === 1 && !existing.has(c.to));
const collided = changes.filter((c) => !safe.includes(c));

if (!DRY) {
  for (const c of safe) {
    const doc = (entries.docs as Record<string, unknown>[]).find((d) => d.id === c.id)!;
    await api.update({
      collection: "entries", id: c.id, data: { title: c.to },
      depth: 0, overrideAccess: true, draft: doc._status !== "published",
    });
  }
}

mkdirSync("data/audit", { recursive: true });
writeFileSync("data/audit/retitled.json", JSON.stringify({ applied: safe, needsHuman: collided }, null, 2));
console.log(`${DRY ? "[DRY RUN] would retitle" : "retitled"} ${safe.length} entries`);
console.log(`left alone (would collide with another title): ${collided.length}\n`);
for (const c of safe.slice(0, 20)) console.log(`  ${c.from}\n    → ${c.to}`);
if (collided.length) {
  console.log("\n  — needs a human, would have collided —");
  for (const c of collided.slice(0, 8)) console.log(`  ${c.from}  →  ${c.to}`);
}
process.exit(0);
