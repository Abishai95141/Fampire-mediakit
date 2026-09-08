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
const peopleField = entries ? findField(entries.fields, "people") : null;
const component = (peopleField?.admin as { components?: { Field?: unknown } } | undefined)?.components?.Field;

console.log(`\nPicture picker\n`);
check("the people field exists on Entries", Boolean(peopleField), peopleField ? "found" : "missing");
check("it renders the PeoplePicker", typeof component === "string" && component.includes("PeoplePicker"), String(component ?? "none"));

const people = await api.find({ collection: "people", limit: 500, depth: 1, overrideAccess: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docs = people.docs as any[];
const family = docs.filter((p) => p.isFamily);
const withPortrait = docs.filter((p) => (p.portraitImage && p.portraitImage.url) || p.portraitUrl);
check("the picker's one request returns every person", docs.length === people.totalDocs, `${docs.length} of ${people.totalDocs}`);
check("the four family members are flagged", family.length === 4, family.map((p) => p.name).join(", "));
check("someone has a portrait to show", withPortrait.length > 0, `${withPortrait.length} with a picture, ${docs.length - withPortrait.length} fall back to initials`);

console.log(failed ? `\n${failed} check(s) FAILED\n` : "\nall checks passed\n");
process.exit(failed ? 1 : 0);
