import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Collapse the fractured Featuring list into canonical people with aliases.
 *
 * The names were read out of folder paths written by different hands over
 * several years, so one person occupies several rows and none of them holds
 * all their material: Porceli/Porcelli, Kreigel/Kriegel, Amie/Aimie Hornaman,
 * Catharine/Catherine Davies, Steve Moore(2)/Steven Moore(7), plus a whole
 * second layer of short-versus-full — "Dr. Bales" beside "Dr. Martin Bales".
 * "Anthony Lolli" existed twice, which is why his own footage was split
 * across two taxonomies.
 *
 * ── Why this is conservative ─────────────────────────────────────────────
 *
 * Sharing a surname is NOT evidence of being the same person. This archive
 * contains Dr. Steven Moore AND Dr. Tyna Moore; Dr. Griffin Cole AND Dr. Will
 * Cole. Merging those would fuse two real doctors' work and no later pass
 * could tell them apart again. So a pair merges only when:
 *
 *   1. the surname matches, AND
 *   2. one first name is ABSENT (short-vs-full: "Dr. Bales" ⊂ "Dr. Martin
 *      Bales"), or the two first names are within one edit of each other
 *      (Amie/Aimie, Steve/Steven, Catharine/Catherine) — a spelling slip,
 *      not a different person.
 *
 * Everything else is left alone and printed, so a human decides rather than
 * a heuristic guessing.
 *
 * Losing spellings are kept as `aliases`, never discarded: the folder name is
 * the client's own, and someone who knows the doctor as "Dr. Bales" must
 * still find them.
 *
 *   DRY_RUN=1 npx payload run scripts/dedupe-people.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })).docs[0];

/**
 * Folder-name parsing artifacts, not people. "17. 03/10/26 Dr. Kuo Extension
 * Health" yielded "Dr. Kuo Extension"; "Dr. Whitfield Morning" came from a
 * morning-session folder. Each maps to the real person, or to null to be
 * dropped where no real person is identifiable.
 */
const ARTIFACTS: Record<string, string | null> = {
  "Dr. Kuo Extension": "Dr. Kuo",
  "Dr. Whitfield Morning": "Dr. Robert Whitfield",
  "Dr. Yu St": "Dr. Yu",
  "Dr. Andres Anthony": null,
};

const strip = (s: string) => s.replace(/^\s*(dr|mr|mrs|ms|prof)\.?\s+/i, "").trim();
const norm = (s: string) => strip(s).toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

function editDistance(a: string, b: string): number {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

type P = { id: number; name: string; slug: string; aliases?: { alias: string }[]; isFamily?: boolean; isMinor?: boolean; refs: number };

const all = await api.find({ collection: "people", limit: 1000, depth: 0, overrideAccess: true });
const people: P[] = [];
for (const p of all.docs as Record<string, unknown>[]) {
  const r = await api.count({
    collection: "entries",
    where: { or: [{ people: { equals: p.id } }, { crew: { equals: p.id } }, { rightsHolder: { equals: p.id } }] },
    overrideAccess: true,
  });
  people.push({ id: p.id as number, name: String(p.name ?? ""), slug: String(p.slug ?? ""),
    aliases: (p.aliases ?? []) as { alias: string }[], isFamily: !!p.isFamily, isMinor: !!p.isMinor, refs: r.totalDocs });
}

/** union-find over merge decisions */
const parent = new Map<number, number>(people.map((p) => [p.id, p.id]));
const find = (x: number): number => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

const byId = new Map(people.map((p) => [p.id, p]));
const declined: string[] = [];
const coinTosses: string[] = [];

// Artifacts first, so they fold into the real person before pairwise matching.
for (const p of people) {
  const target = ARTIFACTS[p.name];
  if (target === undefined) continue;
  if (target === null) continue; // handled after, as a deletion
  const t = people.find((q) => q.name === target || norm(q.name) === norm(target));
  if (t) union(p.id, t.id);
}

for (let i = 0; i < people.length; i++) {
  for (let j = i + 1; j < people.length; j++) {
    const a = people[i], b = people[j];
    if (a.name in ARTIFACTS || b.name in ARTIFACTS) continue;
    const ta = norm(a.name).split(" ").filter(Boolean);
    const tb = norm(b.name).split(" ").filter(Boolean);
    if (!ta.length || !tb.length) continue;
    const sameSurname = ta[ta.length - 1] === tb[tb.length - 1];

    /**
     * FIRST-NAME-ONLY versus full name: "Dr. Jigar" ⊂ "Dr. Jigar Gandhi".
     *
     * The original rule required the LAST token to match, which silently
     * skipped this whole class — "jigar" never equals "gandhi". Four such
     * pairs survived every previous pass and were found by the client's own
     * retrieval test: Jigar/Jigar Gandhi, Rajka/Rajka Milanovic, Yuriy/Yuriy
     * May, and (as a surname slip) Porceli/Porcelli.
     *
     * Deliberately narrow: ONE side must be a single bare token, and that
     * token must equal the other's FIRST token. "Dr. Kuo" ⊂ "Dr. Kuo
     * Extension" is caught by ARTIFACTS instead, and a lone surname such as
     * "Dr. Bales" ⊂ "Dr. Martin Bales" is still the surname rule's job.
     */
    const oneIsBareFirstName =
      (ta.length === 1 && tb.length > 1 && ta[0] === tb[0]) ||
      (tb.length === 1 && ta.length > 1 && tb[0] === ta[0]);

    /**
     * SURNAME SLIP with an identical first name: Richard Porceli/Porcelli.
     *
     * Requiring the first names to match EXACTLY is what keeps this safe —
     * without that, one edit on a surname would fuse Dr. Griffin Cole with a
     * hypothetical "Dr. Griffin Colt", and more importantly it stays clear of
     * the real pairs this archive contains (Nammy Patel vs Nayan Patel share
     * a surname and are different people).
     */
    const aFirstTok = ta.slice(0, -1).join(" ");
    const bFirstTok = tb.slice(0, -1).join(" ");
    const surnameSlip =
      !sameSurname &&
      ta.length > 1 && tb.length > 1 &&
      aFirstTok === bFirstTok &&
      editDistance(ta[ta.length - 1], tb[tb.length - 1]) <= 1;

    if (!sameSurname && !oneIsBareFirstName && !surnameSlip) continue;

    const exact = norm(a.name) === norm(b.name);
    const aFirst = ta.length > 1 ? aFirstTok : "";
    const bFirst = tb.length > 1 ? bFirstTok : "";
    const shortVsFull = aFirst === "" || bFirst === "";
    const firstNameSlip = aFirst && bFirst && editDistance(aFirst, bFirst) <= 1;

    if (exact || oneIsBareFirstName || surnameSlip || shortVsFull || firstNameSlip) union(a.id, b.id);
    else if (aFirst && bFirst) declined.push(`${a.name} (${a.refs})  ≠  ${b.name} (${b.refs})`);
  }
}

// Build groups; canonical = family first, then the MOST COMPLETE NAME, then refs.
const groups = new Map<number, P[]>();
for (const p of people) {
  const r = find(p.id);
  (groups.get(r) ?? groups.set(r, []).get(r)!).push(p);
}

let merged = 0, repointed = 0, dropped = 0;

for (const [, members] of groups) {
  if (members.length < 2) continue;
  /**
   * The surviving name is the most complete one, not the most-used one.
   *
   * Ranking by reference count first is how a merge ends up RENAMING a real
   * person to a folder abbreviation: "Dr. Whitfield" carried 3 references and
   * "Dr. Robert Whitfield" only 2, so the fuller, correct name was the one
   * deleted. Same for Trivedi over Ameet Trivedi and Curatola over Gerry
   * Curatola. Token count decides first — a first-and-surname record always
   * beats a bare surname — and references only break a genuine tie.
   */
  const tokens = (n: string) => norm(n).split(" ").filter(Boolean).length;
  /**
   * Keep the honorific. This archive is mostly clinicians and the client's own
   * folders title them; dropping it would turn "Dr. Ana Maria" into "Ana
   * Maria" purely because the untitled row happened to be used more often.
   */
  const titled = (n: string) => (/^\s*(dr|prof)\.?\s+/i.test(n) ? 1 : 0);
  const rank = (x: P, y: P) =>
    Number(y.isFamily) - Number(x.isFamily) ||
    tokens(y.name) - tokens(x.name) ||
    titled(y.name) - titled(x.name) ||
    y.refs - x.refs;
  /**
   * Deliberately NO length tiebreak.
   *
   * Ranking a longer string higher prefers the typo whenever the typo is the
   * one with the extra letter — it silently kept "Dr. Sanchin Karande" over
   * "Dr. Sachin Karande". A tie here is a real tie, and saying so out loud
   * beats breaking it on a rule that is wrong as often as it is right.
   */
  const ordered = [...members].sort(rank);
  const canonical = ordered[0];

  /**
   * Where the top two are indistinguishable on every rule, the surviving
   * SPELLING was decided by array order, which is not a decision.
   *
   * The merge is still right — these are one person, and the losing spelling
   * survives as an alias so either spelling finds them. Only the display
   * label is a guess, so it is printed for a human rather than presented as
   * settled: Sachin/Sanchin Karande and Catharine/Catherine Davies are real
   * cases where the machine has no basis to prefer either.
   */
  if (ordered.length > 1 && rank(ordered[0], ordered[1]) === 0) {
    coinTosses.push(`${canonical.name}  (kept)  vs  ${ordered[1].name}`);
  }
  const losers = members.filter((m) => m.id !== canonical.id);

  const aliasSet = new Set<string>([
    ...(canonical.aliases ?? []).map((a) => a.alias),
    ...losers.flatMap((l) => [l.name, ...(l.aliases ?? []).map((a) => a.alias)]),
  ]);
  aliasSet.delete(canonical.name);

  console.log(`\n${canonical.name} (${canonical.refs})  ←  ${losers.map((l) => `${l.name} (${l.refs})`).join(", ")}`);
  merged += losers.length;
  if (DRY) continue;

  for (const l of losers) {
    // Repoint every reference, in all three roles, before deleting the row.
    for (const path of ["people", "crew", "rightsHolder"] as const) {
      const hits = await api.find({
        collection: "entries", where: { [path]: { equals: l.id } },
        limit: 2000, depth: 0, overrideAccess: true, draft: true,
      });
      for (const e of hits.docs as Record<string, unknown>[]) {
        const cur = ((e[path] ?? []) as (number | { id: number })[]).map((x) => (typeof x === "object" && x ? x.id : x));
        const next = [...new Set(cur.map((x) => (x === l.id ? canonical.id : x)))];
        await api.update({
          collection: "entries", id: e.id, data: { [path]: next },
          depth: 0, overrideAccess: true, user: admin, draft: e._status !== "published",
        });
        repointed += 1;
      }
    }
    await api.delete({ collection: "people", id: l.id, overrideAccess: true, user: admin });
  }
  await api.update({
    collection: "people", id: canonical.id,
    data: { aliases: [...aliasSet].map((alias) => ({ alias })) },
    depth: 0, overrideAccess: true, user: admin,
  });
}

// Artifacts with no real person behind them.
for (const p of people) {
  if (ARTIFACTS[p.name] !== null) continue;
  console.log(`\ndropping artifact: ${p.name} (${p.refs} refs)`);
  dropped += 1;
  if (DRY) continue;
  for (const path of ["people", "crew", "rightsHolder"] as const) {
    const hits = await api.find({ collection: "entries", where: { [path]: { equals: p.id } }, limit: 2000, depth: 0, overrideAccess: true, draft: true });
    for (const e of hits.docs as Record<string, unknown>[]) {
      const cur = ((e[path] ?? []) as (number | { id: number })[]).map((x) => (typeof x === "object" && x ? x.id : x));
      await api.update({ collection: "entries", id: e.id, data: { [path]: cur.filter((x) => x !== p.id) }, depth: 0, overrideAccess: true, user: admin, draft: e._status !== "published" });
    }
  }
  await api.delete({ collection: "people", id: p.id, overrideAccess: true, user: admin });
}

if (coinTosses.length) {
  console.log(`\nSURVIVING SPELLING WAS A COIN TOSS — a human should pick: ${coinTosses.length}`);
  for (const c of coinTosses) console.log(`  ${c}`);
}
console.log(`\n${DRY ? "[DRY RUN] " : ""}people before ${people.length} → after ${people.length - merged - dropped}`);
console.log(`  merged away: ${merged}   artifacts dropped: ${dropped}   entry references repointed: ${repointed}`);
if (declined.length) {
  console.log(`\nSAME SURNAME, LEFT ALONE (different first names — a human decides): ${declined.length}`);
  for (const d of declined) console.log(`  ${d}`);
}
process.exit(0);
