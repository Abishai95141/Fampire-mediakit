import { writeFileSync, mkdirSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Attach people to collections by reading the names already in the client's
 * own folder paths — into the RIGHT field.
 *
 * Why: searching "Love Lolli" returned nothing from The Guru even though the
 * folders are literally `A_Cam_1_Lolli_Family_Opening`, `..._QNA`,
 * `..._Screening`. 16 of that film's 17 collections had nobody attached.
 *
 * ── The mistake this script exists to avoid ──────────────────────────────
 *
 * A first version matched names anywhere in the ancestry and put them all in
 * `people`. Measured, it would have claimed Adam Chani APPEARS IN 110
 * collections (the ancestor is `sHEALed BTS Adam Chani Master` — he shot
 * them) and TereZa in 97 (ancestors read `owned by TereZa` — she owns them).
 * Her name is in only 8 leaf folders. Both would have been fabricated
 * attributions on a press surface.
 *
 * So role comes from the LANGUAGE AROUND the name, and the archive is
 * consistent enough to read literally (§13 already splits these three):
 *
 *   "owned by X" / "courtesy of X"        → rightsHolder
 *   "BTS X" / "shot by X" / "X Cell Phone" → crew
 *   name in the LEAF folder, no qualifier  → people (appears in)
 *   name only in an ANCESTOR, no qualifier → nothing; logged for review
 *
 * ── The children ─────────────────────────────────────────────────────────
 *
 * Love and Legend attach ONLY where a human already confirmed a minor is
 * present (containsMinor && containsMinorConfirmed). An entry merely graded
 * `minor_risk: context` gets no child: that is a review queue, not a finding.
 * Entries.ts now also derives containsMinor from `people`, so a mistake here
 * flags rather than silently publishes.
 *
 * Only ever adds; never removes an existing attribution.
 *
 *   DRY_RUN=1 npx payload run scripts/derive-attribution.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const OWNER_RE = /\b(?:owned\s+by|courtesy\s+of|property\s+of|belongs\s+to)\b/i;
const CREW_RE =
  /\b(?:bts|behind\s+the\s+scenes|shot\s+by|filmed\s+by|footage\s+by|directed\s+by|edited\s+by|cell\s*phone|phone\s+footage|camera\s+roll)\b/i;

type Role = "people" | "crew" | "rightsHolder";

const peopleBySlug = new Map<string, number>();
for (const slug of ["anthony", "tereza", "love", "legend"]) {
  const r = await api.find({ collection: "people", where: { slug: { equals: slug } }, limit: 1, depth: 0 });
  if (r.docs.length) peopleBySlug.set(slug, r.docs[0].id);
}

/** Multi-token names only — single tokens collide with ordinary folder words. */
const allPeople = await api.find({ collection: "people", limit: 1000, depth: 0, overrideAccess: true });
const matchers: { id: number; label: string; re: RegExp; isMinor: boolean }[] = [];
for (const p of allPeople.docs as { id: number; name?: string; isMinor?: boolean }[]) {
  const name = (p.name ?? "").trim();
  if (!name || name.split(/\s+/).length < 2) continue;
  const loose = name.replace(/[^A-Za-z\s]/g, "").trim().replace(/\s+/g, "[ _-]+");
  if (loose.length < 6) continue;
  // NOT \b. Underscore is a word character, so \b never fires at `_Lolli` —
  // which silently skipped every `A_Cam_1_Lolli_Family_*` folder, i.e. exactly
  // the ones this script was written to catch. These folders are named by
  // cameras, and camera software separates with underscores.
  matchers.push({ id: p.id, label: name, re: new RegExp(`(?<![A-Za-z0-9])${loose}(?![A-Za-z0-9])`, "i"), isMinor: !!p.isMinor });
}
// The family, named as a unit, in a leaf folder. Adults only — see header.
const FAMILY_RE = /(?<![A-Za-z0-9])lol(?:li|ly)[ _-]*family(?![A-Za-z0-9])/i;

const entries = await api.find({
  collection: "entries", limit: 2000, depth: 0, overrideAccess: true, draft: true,
});

const changed: { id: number; title: string; adds: string[] }[] = [];
const ancestorOnly: { id: number; title: string; name: string; segment: string }[] = [];
const childReview: { id: number; title: string; folderPath: string }[] = [];

for (const e of entries.docs as Record<string, unknown>[]) {
  const leaf = String(e.rawFolderName ?? "");
  const segments = String(e.folderPath ?? "").split("/").map((s) => s.trim()).filter(Boolean);
  const ancestors = segments.filter((s) => s !== leaf);
  if (!leaf && !ancestors.length) continue;

  const current: Record<Role, Set<number>> = {
    people: new Set(((e.people ?? []) as (number | { id: number })[]).map((p) => (typeof p === "object" && p ? p.id : p))),
    crew: new Set(((e.crew ?? []) as (number | { id: number })[]).map((p) => (typeof p === "object" && p ? p.id : p))),
    rightsHolder: new Set(((e.rightsHolder ?? []) as (number | { id: number })[]).map((p) => (typeof p === "object" && p ? p.id : p))),
  };
  const add: Record<Role, Set<number>> = { people: new Set(), crew: new Set(), rightsHolder: new Set() };
  const adds: string[] = [];

  const place = (role: Role, id: number, label: string) => {
    if (current[role].has(id) || add[role].has(id)) return;
    add[role].add(id);
    adds.push(`${label}→${role}`);
  };

  for (const m of matchers) {
    if (m.isMinor) continue; // children handled separately, below
    // Leaf first: an unqualified name on the folder itself is the subject.
    if (m.re.test(leaf)) {
      if (OWNER_RE.test(leaf)) place("rightsHolder", m.id, m.label);
      else if (CREW_RE.test(leaf)) place("crew", m.id, m.label);
      else place("people", m.id, m.label);
      continue;
    }
    const seg = ancestors.find((s) => m.re.test(s));
    if (!seg) continue;
    if (OWNER_RE.test(seg)) place("rightsHolder", m.id, m.label);
    else if (CREW_RE.test(seg)) place("crew", m.id, m.label);
    else ancestorOnly.push({ id: e.id as number, title: String(e.title ?? ""), name: m.label, segment: seg });
  }

  // "Lolli Family" on the leaf → the adults appear in it.
  if (FAMILY_RE.test(leaf) && !OWNER_RE.test(leaf) && !CREW_RE.test(leaf)) {
    for (const s of ["anthony", "tereza"]) {
      const id = peopleBySlug.get(s);
      if (id) place("people", id, s);
    }
    if (e.containsMinor === true && e.containsMinorConfirmed === true) {
      for (const s of ["love", "legend"]) {
        const id = peopleBySlug.get(s);
        if (id) place("people", id, s);
      }
    } else {
      childReview.push({ id: e.id as number, title: String(e.title ?? ""), folderPath: String(e.folderPath ?? "") });
    }
  }

  const total = add.people.size + add.crew.size + add.rightsHolder.size;
  if (!total) continue;
  changed.push({ id: e.id as number, title: String(e.title ?? ""), adds });

  if (!DRY) {
    await api.update({
      collection: "entries",
      id: e.id,
      data: {
        people: [...current.people, ...add.people],
        crew: [...current.crew, ...add.crew],
        rightsHolder: [...current.rightsHolder, ...add.rightsHolder],
      },
      depth: 0,
      overrideAccess: true,
      draft: e._status !== "published",
    });
  }
}

mkdirSync("data/audit", { recursive: true });
writeFileSync("data/audit/attribution-ancestor-only.json", JSON.stringify(ancestorOnly, null, 2));
writeFileSync("data/audit/child-attribution-review.json", JSON.stringify(childReview, null, 2));

const tally = new Map<string, number>();
for (const c of changed) for (const a of c.adds) tally.set(a, (tally.get(a) ?? 0) + 1);
console.log(`${DRY ? "[DRY RUN] would update" : "updated"} ${changed.length} entries\n`);
for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${k}: ${v}`);
console.log(`\nambiguous (name in an ancestor, no role word) — NOT attached: ${ancestorOnly.length}`);
console.log(`family named but minor not confirmed — no child attached: ${childReview.length}`);
process.exit(0);
