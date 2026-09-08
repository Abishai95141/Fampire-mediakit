import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Record the other spellings people actually type.
 *
 *   DRY_RUN=1 npx payload run scripts/seed-person-aliases.ts
 *              npx payload run scripts/seed-person-aliases.ts
 *
 * The `aliases` field has been on People since the import, with a description
 * promising "Search matches these too". Nothing carried it as far as the
 * search index, and no row had ever been filled in — so the promise was never
 * kept and no one could tell, because an empty table looks the same as a
 * working one.
 *
 * Every entry below is a spelling somebody REALLY used, not a guess at what
 * they might. The first two are the names the client himself said on the
 * walkthrough recording; searching them returned nothing while the archive
 * held eight and ten collections respectively.
 *
 * This is a starting set, not a dictionary. Editors add more in the CMS —
 * People → the person → Aliases — and search picks them up on the next
 * request with no deploy.
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const ALIASES: { name: string; add: string[]; why: string }[] = [
  {
    name: "Bryan Johnson",
    add: ["Brian Johnson"],
    why: "the client searched 'Brian Johnson' and got 0; the archive spells it Bryan (8 collections)",
  },
  {
    name: "Zachary Levi",
    add: ["Zachary LaValle", "Zach Levi"],
    why: "the client called Issue #7's cover star 'Zachary LaValle'; the folders say Zachary Levi (10 collections)",
  },
  {
    name: "TereZa Hakobyan-Lolli",
    add: ["Teresa", "Teresa Lolli", "Tereza Lolli", "Teresa Hakobyan-Lolli"],
    why: "the capital Z is a house rule, so the ordinary spelling is what outsiders will type",
  },
];

let changed = 0;
const log: string[] = [];

for (const row of ALIASES) {
  const person = (
    await api.find({ collection: "people", where: { name: { equals: row.name } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0];

  if (!person) {
    log.push(`  SKIP  ${row.name} — no such person`);
    continue;
  }

  const have = new Set(
    ((person.aliases ?? []) as { alias?: string }[]).map((a) => (a?.alias ?? "").toLowerCase()).filter(Boolean),
  );
  const missing = row.add.filter((a) => !have.has(a.toLowerCase()));

  if (!missing.length) {
    log.push(`  ok    ${row.name} — already has ${row.add.length} alias(es)`);
    continue;
  }

  log.push(`  ${DRY ? "would add" : "added"}  ${row.name} ← ${missing.join(", ")}`);
  log.push(`          ${row.why}`);
  if (DRY) continue;

  await api.update({
    collection: "people",
    id: person.id,
    data: { aliases: [...((person.aliases ?? []) as unknown[]), ...missing.map((alias) => ({ alias }))] },
    depth: 0,
    overrideAccess: true,
  });
  changed++;
}

// Read back, because a write that reports itself is not evidence.
const withAliases = await api.find({
  collection: "people",
  where: { "aliases.alias": { exists: true } },
  limit: 500,
  depth: 0,
  overrideAccess: true,
});
const total = withAliases.docs.reduce(
  (n: number, p: { aliases?: unknown[] }) => n + (p.aliases?.length ?? 0),
  0,
);

console.log(log.join("\n"));
console.log(
  DRY
    ? "\n[DRY RUN] nothing written"
    : `\n${changed} person record(s) updated — ${withAliases.totalDocs} people now carry ${total} alias(es)`,
);
process.exit(0);
