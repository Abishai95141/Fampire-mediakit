import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Prove the two features are actually there, on whatever database this runs
 * against.
 *
 *   npx payload run scripts/verify-magazine-tree.ts
 *
 * Written because the seed's own "linked 62" was once a lie: it reported what
 * it had asked for rather than what landed, and `issue_id` was null on every
 * live row. So this reads back independently — the tree from the issues side,
 * the collection counts from the entries side — and fails loudly rather than
 * printing a number nobody checked.
 */

const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

let failed = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(52)} ${detail}`);
};

/**
 * Something true of the DATA, not of the code — reported, never failed.
 *
 * A check that cannot pass on a clean install is not a check, it is a false
 * alarm that teaches people to ignore the runner. Portraits are uploads: a
 * database nobody has uploaded to correctly has none.
 */
const observe = (label: string, detail: string) =>
  console.log(`  ----  ${label.padEnd(52)} ${detail}`);

// ── the tree ─────────────────────────────────────────────────────────────
const issues = (
  await api.find({ collection: "magazine-issues", limit: 100, depth: 1, sort: "issueNumber", overrideAccess: true })
).docs as { id: number; issueNumber: number; title: string; coverSubject?: { name?: string } | number | null }[];

console.log(`\nMagazines → cover star → issue → collections\n`);
check("magazine issues exist", issues.length > 0, `${issues.length} issue(s)`);

let totalLinked = 0;
for (const i of issues) {
  const n = (
    await api.find({ collection: "entries", where: { issue: { equals: i.id } }, limit: 0, depth: 0, overrideAccess: true })
  ).totalDocs as number;
  totalLinked += n;
  const cover =
    i.coverSubject && typeof i.coverSubject === "object" ? i.coverSubject.name ?? "(unnamed)" : "(no cover recorded)";
  console.log(`        Issue #${String(i.issueNumber).padEnd(3)} ${String(cover).padEnd(24)} ${n} collection(s)`);
}

// ── the collections agree ────────────────────────────────────────────────
const tagged = (
  await api.find({ collection: "entries", where: { magazineIssue: { exists: true } }, limit: 0, depth: 0, overrideAccess: true })
).totalDocs as number;

check("every magazine collection is linked to an issue", totalLinked === tagged, `${totalLinked} of ${tagged}`);
check("at least one issue names its cover star",
  issues.some((i) => i.coverSubject && typeof i.coverSubject === "object"),
  `${issues.filter((i) => i.coverSubject && typeof i.coverSubject === "object").length} of ${issues.length} have a cover`);

// ── the picker is wired to the field it claims ───────────────────────────
const entries = api.collections?.entries?.config;
const findField = (fields: unknown[], name: string): Record<string, unknown> | null => {
  for (const f of fields as Record<string, unknown>[]) {
    if (f?.name === name) return f;
    for (const key of ["fields", "tabs"]) {
      const nested = f?.[key];
      if (Array.isArray(nested)) {
        const hit = findField(nested, name);
        if (hit) return hit;
      }
    }
  }
  return null;
};
console.log(`\nPicture pickers\n`);

/** The path may be a bare string or `{ path, clientProps }` — accept both. */
const pickerPath = (f: Record<string, unknown> | null): string | null => {
  const c = (f?.admin as { components?: { Field?: unknown } } | undefined)?.components?.Field;
  if (typeof c === "string") return c;
  if (c && typeof c === "object") return ((c as { path?: string }).path ?? null);
  return null;
};

for (const [name, label] of [
  ["people", "Featuring"],
  ["crew", "Crew"],
  ["rightsHolder", "Rights holder"],
  ["tenant", "Brand (the client's \"publishers\")"],
] as const) {
  const f = entries ? findField(entries.fields, name) : null;
  const path = pickerPath(f);
  check(`${label} picks by picture`, Boolean(path?.includes("RecordPicker")), path ?? "stock dropdown");
}

// The tree is worthless if the collection is not in the sidebar. `group: false`
// makes groupNavItems skip it entirely, which is where this started.
const issuesAdmin = (api.collections?.["magazine-issues"]?.config?.admin ?? {}) as { group?: unknown; groupBy?: unknown };
check("Magazine Issues is visible in the sidebar", issuesAdmin.group !== false, String(issuesAdmin.group));
check("issues can be grouped by cover star", issuesAdmin.groupBy === true, String(issuesAdmin.groupBy));

console.log("");
const people = await api.find({ collection: "people", limit: 500, depth: 1, overrideAccess: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docs = people.docs as any[];
const family = docs.filter((p) => p.isFamily);
const withPortrait = docs.filter((p) => (p.portraitImage && p.portraitImage.url) || p.portraitUrl);
check("the picker's one request returns every person", docs.length === people.totalDocs, `${docs.length} of ${people.totalDocs}`);
check("the four family members are flagged", family.length === 4, family.map((p) => p.name).join(", "));
observe(
  "portraits uploaded",
  withPortrait.length
    ? `${withPortrait.length} with a picture, ${docs.length - withPortrait.length} fall back to initials`
    : `none yet — all ${docs.length} render as initials, which is the designed fallback`,
);

console.log(failed ? `\n${failed} check(s) FAILED\n` : "\nall checks passed\n");
process.exit(failed ? 1 : 0);
