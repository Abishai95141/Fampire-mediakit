/**
 * Prove the coverage claim instead of asserting it.
 *
 * The deliverable said "92% of the archive". That was `files_all_copies`
 * (125,170 / 135,611) — a sum over folders that merely shared a normalised
 * NAME, while each entry linked to exactly one of them and the rest were
 * recorded nowhere. Physically reachable coverage was 60.5%.
 *
 * The fix was not to lower the number but to make it true: the rollup now
 * records every merged folder as an `alternate`, each entry links them, and
 * the detail page renders them. This walks the actual folder tree from every
 * published entry AND its alternates and counts distinct files — so the figure
 * in the deliverable is one anybody can reproduce.
 *
 * Run: node scripts/verify-coverage.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const crawl = JSON.parse(readFileSync(`${process.env.HOME}/Fampire/data/drive-crawl-full.json`, "utf8"));
let sup = { files: {} };
try { sup = JSON.parse(readFileSync(`${ROOT}/data/audit/crawl-supplement.json`, "utf8")); } catch {}
const parents = JSON.parse(readFileSync(`${ROOT}/data/audit/drive-folder-parents.json`, "utf8"));
const { entries } = JSON.parse(readFileSync(`${ROOT}/data/fampire/entries.json`, "utf8"));

const files = { ...crawl.files, ...sup.files };
const kids = {};
for (const [c, p] of Object.entries(parents)) (kids[p] ??= []).push(c);
const byFolder = {};
for (const [id, v] of Object.entries(files)) if (v[2]) (byFolder[v[2]] ??= []).push(id);

function under(root, acc) {
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const id of byFolder[f] ?? []) acc.add(id);
    for (const c of kids[f] ?? []) stack.push(c);
  }
}

const idOf = (u) => (/\/folders\/([^/?#]+)/.exec(u || "") ?? [])[1];
const total = Object.keys(files).length;

const reach = (filter) => {
  const acc = new Set();
  for (const e of entries) {
    if (!filter(e)) continue;
    if (e.folder_id) under(e.folder_id, acc);
    for (const a of e.alternates ?? []) { const id = idOf(a); if (id) under(id, acc); }
  }
  return acc.size;
};

const headOnly = (() => {
  const acc = new Set();
  for (const e of entries) if (e.disposition === "publish" && e.folder_id) under(e.folder_id, acc);
  return acc.size;
})();

const published = reach((e) => e.disposition === "publish");
const all = reach(() => true);
const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

console.log(`total files in the crawl            ${total.toLocaleString()}`);
console.log(`reachable — published entries       ${published.toLocaleString()}  ${pct(published)}`);
console.log(`reachable — all entries             ${all.toLocaleString()}  ${pct(all)}`);
console.log(`head folder only (no alternates)    ${headOnly.toLocaleString()}  ${pct(headOnly)}`);
console.log(`unreachable                         ${(total - all).toLocaleString()}  ${pct(total - all)}`);
console.log(`\nThe publishable figure is the one to quote: ${pct(published)}`);

// A regression guard: if alternates stop being written, coverage collapses to
// the head-folder number and this fails loudly rather than silently.
if (published < headOnly * 1.2) {
  console.error("\nFAIL: alternates appear not to be linked — coverage is head-folder only.");
  process.exit(1);
}
