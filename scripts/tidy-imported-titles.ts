import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Strip the punctuation debris left by stripping dates out of folder names.
 *
 * The client's folders are named "23. 12/06/25 - Wolf Gym Activation". Removing
 * the numbering and the date leaves "- Wolf Gym Activation", and the leading
 * separators from "* All Event Step&Repeats" and "/2025 - JCCI Congress"
 * survive the same way. 35 titles came out of the import with a stray leading
 * "-", "*" or "/", and one repeated its own context ("- Wall Street Experience
 * Of The South — - Wall Street Experience Of The South Footage").
 *
 * Only ever edits punctuation and duplicated context; never invents words.
 *
 *   DRY_RUN=1 npx payload run scripts/tidy-imported-titles.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({
  collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true,
})).docs[0];

/** Leading separators, and the leftovers of a stripped date like "/2025 - ". */
const tidyPart = (s: string) =>
  s
    .replace(/^[\s*\-–—/,.:;#]+/, "")
    .replace(/^\d{2,4}\s*[-–—]\s*/, "")
    // NOT "*" here: the client uses paired asterisks as emphasis
    // ("*No Audio First 15 Minutes*"), and stripping only the closing one
    // leaves the title lopsided — worse than leaving both.
    .replace(/[\s\-–—/,.:;]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const entries = await api.find({
  collection: "entries", limit: 3000, depth: 0, overrideAccess: true, draft: true,
});

const changes: { id: number; from: string; to: string }[] = [];
for (const e of entries.docs as Record<string, unknown>[]) {
  const title = String(e.title ?? "");
  const parts = title.split(" — ").map(tidyPart).filter(Boolean);
  // "X — X Footage" repeats itself; keep the more specific half.
  const deduped = parts.filter((p, i) => {
    const later = parts.slice(i + 1);
    return !later.some((q) => q.toLowerCase().startsWith(p.toLowerCase()));
  });
  const next = deduped.join(" — ").trim();
  if (!next || next === title) continue;
  changes.push({ id: e.id as number, from: title, to: next });
}

// Refuse any rename that would make two collections indistinguishable.
const taken = new Map<string, number>();
for (const e of entries.docs as Record<string, unknown>[]) {
  const t = String(e.title ?? "");
  taken.set(t, (taken.get(t) ?? 0) + 1);
}
const proposed = new Map<string, number>();
for (const c of changes) proposed.set(c.to, (proposed.get(c.to) ?? 0) + 1);
const safe = changes.filter((c) => (proposed.get(c.to) ?? 0) === 1 && !taken.has(c.to));

if (!DRY) {
  for (const c of safe) {
    const doc = (entries.docs as Record<string, unknown>[]).find((d) => d.id === c.id)!;
    await api.update({
      collection: "entries", id: c.id, data: { title: c.to },
      user: admin, depth: 0, overrideAccess: true, draft: doc._status !== "published",
    });
  }
}

console.log(`${DRY ? "[DRY RUN] would tidy" : "tidied"} ${safe.length} titles (${changes.length - safe.length} held back to avoid a collision)\n`);
for (const c of safe.slice(0, 14)) console.log(`  ${c.from}\n    → ${c.to}`);
process.exit(0);
