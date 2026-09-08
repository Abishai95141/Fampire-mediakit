import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Build the "magazines → cover star → issue → collections" tree the client
 * asked for, out of what the archive already says.
 *
 *   DRY_RUN=1 npx payload run scripts/seed-magazine-tree.ts
 *              npx payload run scripts/seed-magazine-tree.ts
 *
 * Three steps, each idempotent so this can be re-run after new magazine work
 * lands:
 *
 *   1. create the People records the cover stars need, where missing
 *   2. create one Magazine Issue per issue number actually present
 *   3. point every entry's `issue` relationship at its issue
 *
 * The middle level of the client's tree — the cover star — is `coverSubject`,
 * which already existed on `magazine-issues`. The collection simply had no
 * rows in it, which is why the tree was invisible rather than absent.
 *
 * COVER ATTRIBUTION IS EVIDENCE-ONLY. Every name below is taken from the
 * client's own folder titles, quoted in `why`. Issues whose folders never say
 * who was on the cover are created with the cover left EMPTY rather than
 * guessed — including #4, where the only signal is "Jay Dhaliwal Back Cover",
 * and a back cover is not the cover star.
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

/** Cover stars, each with the folder text that establishes it. */
const COVERS: Record<number, { name: string; why: string } | null> = {
  1: null, //  no folder in the archive names a cover
  2: null,
  3: { name: "Lara Trump", why: "Issue #3 — Lara Trump — Lara Trump Cover Shoot Deliverables" },
  4: null, //  only "Jay Dhaliwal Back Cover" — the back cover, not the cover
  5: { name: "Andrew Tate", why: "Andrew Tate (Cover Star) - Biohack Yourself Issue #5 Magazine" },
  6: { name: "Bryan Johnson", why: "Issue #6 — Bryan Johnson — Bryan Johnson Edited Photos" },
  7: { name: "Zachary Levi", why: "Issue #7 — Zachary Levi — Zachary Levi Edited Photos" },
  8: { name: "Ashton Hall", why: "Ashton Hall Cover Shoot — Issue #8 — Magazine" },
  10: { name: "Dr. Shefali", why: "Issue #10 — Dr. Shefali — Dr. Shefali Cover Shoot Deliverables" },
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const log: string[] = [];

// ── which issue numbers actually exist ───────────────────────────────────
const entries = (
  await api.find({
    collection: "entries",
    where: { magazineIssue: { exists: true } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    pagination: false,
  })
).docs as { id: number; title: string; magazineIssue: number; issue?: number | null; _status?: string }[];

const numbers = [...new Set(entries.map((e) => e.magazineIssue))].filter(Boolean).sort((a, b) => a - b);
log.push(`issues present in the archive: ${numbers.join(", ")}  (${entries.length} collections)`);

// ── 1. people ────────────────────────────────────────────────────────────
const peopleId = new Map<string, number>();
for (const n of numbers) {
  const cover = COVERS[n];
  if (!cover) continue;
  const existing = (
    await api.find({ collection: "people", where: { name: { equals: cover.name } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0];
  if (existing) {
    peopleId.set(cover.name, existing.id);
    continue;
  }
  if (DRY) {
    log.push(`  would create person: ${cover.name}`);
    continue;
  }
  const made = await api.create({
    collection: "people",
    data: { name: cover.name, slug: slugify(cover.name), role: "Cover star, Biohack Yourself Magazine" },
    depth: 0,
    overrideAccess: true,
  });
  peopleId.set(cover.name, made.id);
  log.push(`  created person: ${cover.name} (#${made.id})`);
}

// ── 2. issues ────────────────────────────────────────────────────────────
const issueId = new Map<number, number>();
for (const n of numbers) {
  const cover = COVERS[n];
  const coverSubject = cover ? peopleId.get(cover.name) ?? null : null;
  const data = {
    issueNumber: n,
    // Required and unique, with no generator on the collection — so it is set
    // here rather than left to fail validation. Stable and derived from the
    // number, so a re-run updates the same row instead of colliding.
    slug: `issue-${n}`,
    title: `Biohack Yourself — Issue #${n}`,
    ...(coverSubject ? { coverSubject } : {}),
  };

  const existing = (
    await api.find({ collection: "magazine-issues", where: { issueNumber: { equals: n } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0];

  if (DRY) {
    log.push(`  ${existing ? "would update" : "would create"} Issue #${n}${cover ? ` — cover: ${cover.name}` : " — cover: (none, no evidence)"}`);
    continue;
  }

  const doc = existing
    ? await api.update({ collection: "magazine-issues", id: existing.id, data, depth: 0, overrideAccess: true })
    : await api.create({ collection: "magazine-issues", data, depth: 0, overrideAccess: true });
  issueId.set(n, doc.id);
  log.push(`  Issue #${n} → #${doc.id}${cover ? ` — cover: ${cover.name}` : " — cover: (none, no evidence)"}`);
}

// ── 3. link the collections ──────────────────────────────────────────────
let linked = 0, already = 0;
const failed: string[] = [];
for (const e of entries) {
  const target = issueId.get(e.magazineIssue);
  if (!target) continue;
  // Relationship comes back as an id at depth 0, or an object if populated.
  const current = typeof e.issue === "object" && e.issue ? (e.issue as { id: number }).id : e.issue;
  if (current === target) {
    already++;
    continue;
  }
  if (DRY) {
    linked++;
    continue;
  }
  try {
    /**
     * Written as PUBLISHED, deliberately — `draft: true` here was a silent
     * failure.
     *
     * With drafts on, a draft update lands in `_entries_v` and leaves the live
     * `entries` row untouched. The script cheerfully reported "linked 62"
     * while `select count(*) where issue_id is not null` returned 0, so the
     * admin list had nothing to group by. All 62 magazine collections are
     * published, and none of them is an unconfirmed contains-minor row, so a
     * normal update keeps their status and never reaches the safety gate.
     */
    await api.update({
      collection: "entries",
      id: e.id,
      data: { issue: target, _status: e._status ?? "published" },
      depth: 0,
      overrideAccess: true,
    });
    linked++;
  } catch (err) {
    failed.push(`${e.title}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Read it back off the live rows.
 *
 * The claim "linked N" is about what was WRITTEN; this is about what is
 * actually there, which is the thing that was wrong last time. A backfill that
 * cannot prove itself is a backfill nobody should trust.
 */
if (!DRY) {
  const check = await api.find({
    collection: "entries",
    where: { and: [{ magazineIssue: { exists: true } }, { issue: { exists: true } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  log.push(`verified on live rows: ${check.totalDocs} of ${entries.length} carry an issue`);
  if (check.totalDocs !== entries.length) failed.push(`only ${check.totalDocs}/${entries.length} landed`);
}

log.push(`\nlinked ${linked} collection(s) to an issue; ${already} already correct`);
if (failed.length) {
  log.push(`${failed.length} FAILED:`);
  failed.slice(0, 10).forEach((f) => log.push(`  ${f}`));
}

console.log(log.join("\n"));
console.log(DRY ? "\n[DRY RUN] nothing written" : "\nmagazine tree seeded");
process.exit(failed.length ? 1 : 0);
