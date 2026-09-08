import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Prove, on whatever database this runs against, that a tag written in the CMS
 * is findable in the library.
 *
 * Adds a nonsense tag to one published collection, asks the site for it,
 * then puts the row back exactly as it was — in a `finally`, so an assertion
 * failure cannot leave a stray tag on a client record.
 */
const SITE = process.env.SITE ?? "http://localhost:3200";
const TAG = "zzprobe-rapid-realty";

const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const target = (
  await api.find({ collection: "entries", where: { _status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];
if (!target) throw new Error("no published entry to probe with");

const before = (target.tags ?? []) as { tag: string }[];
const count = async () => {
  const t = await (await fetch(`${SITE}/library?q=${encodeURIComponent(TAG)}`)).text();
  const m = t.replace(/<[^>]+>/g, " ").match(/(\d[\d,]*)\s+of\s+[\d,]+\s+collections/);
  return m ? Number(m[1].replace(/,/g, "")) : 0;
};

let failed = 0;
try {
  const zero = await count();
  console.log(`  ${zero === 0 ? "PASS" : "FAIL"}  before tagging, "${TAG}" finds ${zero}`);
  if (zero !== 0) failed++;

  await api.update({
    collection: "entries", id: target.id,
    data: { tags: [...before, { tag: TAG }], _status: "published" },
    depth: 0, overrideAccess: true,
  });

  const after = await count();
  console.log(`  ${after === 1 ? "PASS" : "FAIL"}  after tagging "${target.title}", it finds ${after}`);
  if (after !== 1) failed++;
} finally {
  await api.update({
    collection: "entries", id: target.id,
    data: { tags: before, _status: "published" },
    depth: 0, overrideAccess: true,
  });
  const reverted = await count();
  console.log(`  ${reverted === 0 ? "PASS" : "FAIL"}  reverted, "${TAG}" finds ${reverted} again`);
  if (reverted !== 0) failed++;
}
console.log(failed ? `\n${failed} FAILED\n` : "\ntag search verified end to end\n");
process.exit(failed ? 1 : 0);
