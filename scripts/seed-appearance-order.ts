import config from "@payload-config";
import { getPayload } from "payload";
// Payload's OWN fractional-indexing implementation, not a hand-rolled scheme.
// Drag-reorder calls `generateKeyBetween` to slot a row between its new
// neighbours; keys invented in some other format would sort correctly at first
// and then fail the moment anyone actually dragged something.
//
// Imported from `payload/shared`, which is a real export — reaching into
// `payload/dist/...` throws ERR_PACKAGE_PATH_NOT_EXPORTED and would also be a
// private path that any Payload patch release is free to move.
import { generateNKeysBetween } from "payload/shared";

/**
 * Give every existing appearance an order key matching how the page reads today.
 *
 * Enabling `orderable` adds the `_order` column but leaves it NULL on every
 * existing row — measured: 57 of 57. Switching the public sort to `_order`
 * in that state would have thrown the press log into arbitrary order the
 * moment it deployed, which is a visible regression nobody asked for.
 *
 * So the keys are seeded in the ORDER THE PAGE ALREADY USES — date descending,
 * newest first — and only then does the sort change. Net effect on the public
 * page: nothing moves. It moves when someone drags something, which is the
 * point.
 *
 *   DRY_RUN=1 npx payload run scripts/seed-appearance-order.ts
 */

const DRY = process.env.DRY_RUN === "1";
/**
 * Rewrite keys even where one already exists.
 *
 * Needed because clearing `_order` with raw SQL only empties the main table —
 * Payload reads the draft version, which still carries the old value, so the
 * script sees "already ordered" and does nothing. Re-seeding through Payload
 * is the only way to change both layers.
 */
const FORCE = process.env.FORCE === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const all = await api.find({
  collection: "appearances",
  limit: 1000,
  depth: 0,
  overrideAccess: true,
  draft: true,
  // NOT Payload's `-date`: that puts rows with no date FIRST, while the press
  // log pushed undated entries to the END ("The Passionate Few" has no date).
  // Seeding from Payload's order would therefore have *moved* the page on
  // deploy — the exact regression this whole seeding step exists to avoid.
  // Sorted below with the log's own rule instead.
});

const airedTime = (d: { date?: string | null }) => {
  if (!d.date) return -Infinity;
  const t = Date.parse(String(d.date));
  return Number.isNaN(t) ? -Infinity : t;
};

const docs = ([...all.docs] as { id: number | string; title?: string; date?: string | null; _order?: string | null }[])
  .sort((a, b) => airedTime(b) - airedTime(a));
const unset = FORCE ? docs : docs.filter((d) => !d._order);
console.log(`appearances: ${docs.length}  already ordered: ${docs.length - unset.length}  to seed: ${unset.length}`);
if (!unset.length) {
  console.log("nothing to do");
  process.exit(0);
}

// One ascending run of keys, assigned in the current display order.
const keys: string[] = generateNKeysBetween(null, null, docs.length);

let n = 0;
for (let i = 0; i < docs.length; i++) {
  const d = docs[i]!;
  if (!FORCE && d._order) continue;
  if (!DRY) {
    await api.update({
      collection: "appearances",
      id: d.id,
      data: { _order: keys[i] },
      depth: 0,
      overrideAccess: true,
    });
  }
  n += 1;
  if (n <= 5) console.log(`  ${keys[i]}  ${String(d.title ?? "").slice(0, 46)}`);
}
console.log(`\n${DRY ? "[DRY RUN] would set" : "set"} _order on ${n} appearances`);
process.exit(0);
