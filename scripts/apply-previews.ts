import { readFileSync } from "node:fs";
import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Write the covers found by scripts/enrich/backfill-previews.mjs.
 *
 * Only frames Drive actually served are in that file — the sampler fetches
 * each candidate and checks for a real image body before recording it, so a
 * card can never end up pointing at a 404.
 */
const payload = await getPayload({ config });
const found = JSON.parse(readFileSync("data/audit/backfilled-previews.json", "utf8")) as Record<string, string>;

let n = 0;
let skipped = 0;
for (const [folderId, previewFileId] of Object.entries(found)) {
  // Matched on the client's own Drive folder id, which is the same in every
  // database. Row ids are not.
  const r = await payload.find({
    collection: "entries",
    where: { folderId: { equals: folderId } },
    limit: 1, depth: 0, overrideAccess: true, draft: true,
  });
  const doc = r.docs[0];
  if (!doc) { skipped++; continue; }
  await payload.update({
    collection: "entries",
    id: doc.id,
    data: { previewFileId },
    draft: false,
    overrideAccess: true,
  });
  n++;
}
if (skipped) console.log(`${skipped} folders had no matching entry here`);
console.log(`applied ${n} recovered covers`);
