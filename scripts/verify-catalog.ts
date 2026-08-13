import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Checks the invariants the build plan calls non-negotiable.
 *
 * These are assertions about live data, not unit tests of pure functions —
 * the point is that the DATABASE is in a state that cannot publish a child's
 * image unflagged, cannot leak a draft to a signed-out reader, and cannot
 * spell TereZa with a small z.
 *
 * Run: npx payload run scripts/verify-catalog.ts
 */

const payload = await getPayload({ config });

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};

console.log("\n§9.1  Child safety");

const flagged = await payload.find({
  collection: "entries",
  where: { containsMinor: { equals: true }, containsMinorConfirmed: { equals: false } },
  limit: 1,
  depth: 0,
});
ok("flagged-but-unconfirmed entries exist to test against", flagged.docs.length > 0,
  `${flagged.totalDocs} flagged`);

if (flagged.docs.length) {
  const victim = flagged.docs[0]!;
  let refused = false;
  let message = "";
  try {
    await payload.update({
      collection: "entries",
      id: victim.id,
      data: { _status: "published" },
      // An admin, i.e. the most privileged caller there is.
      overrideAccess: true,
      depth: 0,
    });
  } catch (err) {
    refused = true;
    message = (err as Error).message.slice(0, 80);
  }
  ok("publishing a flagged, unconfirmed entry is REFUSED", refused, message);

  const after = await payload.findByID({ collection: "entries", id: victim.id, depth: 0 });
  ok("…and it is still not published", after._status !== "published", `_status=${after._status}`);
}

const published = await payload.find({
  collection: "entries",
  where: {
    and: [
      { _status: { equals: "published" } },
      { containsMinor: { equals: true } },
      { containsMinorConfirmed: { equals: false } },
    ],
  },
  limit: 0,
  depth: 0,
});
ok("no published entry is flagged-and-unconfirmed", published.totalDocs === 0,
  `${published.totalDocs} violations`);

console.log("\n§2.4  Ungated public reads, but no draft leakage");

const anon = await payload.find({
  collection: "entries",
  limit: 0,
  depth: 0,
  overrideAccess: false, // as a signed-out reader
  req: { user: null } as never,
});
const drafts = await payload.find({
  collection: "entries",
  where: { _status: { not_equals: "published" } },
  limit: 0,
  depth: 0,
});
/**
 * Size-independent. This previously asserted `anon + drafts <= 559`, a
 * hardcoded corpus size that started failing the moment the catalog grew —
 * a check that breaks on growth tests the number, not the property.
 *
 * The real property: a signed-out reader sees exactly the published set, and
 * never a draft.
 */
const publishedCount = await payload.count({
  collection: "entries",
  where: { _status: { equals: "published" } },
});
ok(
  "a signed-out reader sees exactly the published entries, no drafts",
  anon.totalDocs === publishedCount.totalDocs,
  `anon ${anon.totalDocs} = published ${publishedCount.totalDocs}, drafts ${drafts.totalDocs} hidden`,
);

/**
 * No phantom collections.
 *
 * Deleting a document can leave its rows behind in `_entries_v` with a null
 * parent, and Payload's draft query reads that table — so the orphans surface
 * as real-looking collections that ONLY a signed-in editor sees, with no row
 * in `entries` behind them. Two such rows (a deleted "Monitor negative test")
 * made the Library read "602 of 602" against 601 actual entries.
 *
 * The draft-inclusive count is the one that catches it; the public count never
 * moves, which is exactly why this went unseen.
 */
const withDrafts = await payload.find({
  collection: "entries",
  draft: true,
  limit: 0,
  depth: 0,
  overrideAccess: true,
});
const real = await payload.count({ collection: "entries", overrideAccess: true });
ok(
  "no phantom collections — every draft-visible row has a document behind it",
  withDrafts.totalDocs === real.totalDocs,
  `draft-visible ${withDrafts.totalDocs} = documents ${real.totalDocs}`,
);

console.log("\n§10  TereZa is always spelled with a capital Z");

const lower = await payload.find({
  collection: "entries",
  where: { or: [{ title: { like: "Tereza" } }, { description: { like: "Tereza" } }] },
  limit: 5,
  depth: 0,
});
const realLeaks = lower.docs.filter(
  (d) => /Tereza/.test(String(d.title)) || /Tereza/.test(String(d.description)),
);
ok("no lowercase 'Tereza' in any title or description", realLeaks.length === 0,
  realLeaks.length ? realLeaks[0]!.title as string : "");

console.log("\n§4.5  Filters — two axes at once, and they actually narrow");

const total = await payload.count({ collection: "entries" });
const byKind = await payload.find({
  collection: "entries", where: { kind: { equals: "b-roll" } }, limit: 0, depth: 0,
});
const twoAxis = await payload.find({
  collection: "entries",
  where: { and: [{ kind: { equals: "b-roll" } }, { occasion: { equals: "clinic-production" } }] },
  limit: 0, depth: 0,
});
ok("kind filter narrows", byKind.totalDocs > 0 && byKind.totalDocs < total.totalDocs,
  `b-roll ${byKind.totalDocs}/${total.totalDocs}`);
ok("kind × occasion narrows further", twoAxis.totalDocs > 0 && twoAxis.totalDocs <= byKind.totalDocs,
  `b-roll × clinic-production = ${twoAxis.totalDocs}`);

const byPerson = await payload.find({
  collection: "entries", where: { "people.slug": { equals: "tereza" } }, limit: 0, depth: 0,
});
ok("relationship filter works (people.slug)", byPerson.totalDocs > 0, `TereZa: ${byPerson.totalDocs}`);

const byYear = await payload.find({
  collection: "entries", where: { year: { equals: 2025 } }, limit: 0, depth: 0,
});
ok("year filter works", byYear.totalDocs > 0, `2025: ${byYear.totalDocs}`);

console.log("\n§2.2  Tenancy");
const brands = await payload.count({ collection: "brands" });
/**
 * Seven, not eight. HNN is the eighth world of the institution but it is a
 * separate application with its own database and its own CMS — it is not a
 * tenant here, and modelling it as one produced a front-door card that
 * pretended to be part of this site.
 */
ok("the seven worlds in this CMS exist", brands.totalDocs === 7, `${brands.totalDocs} brands`);
const hnn = await payload.find({ collection: "brands", where: { slug: { equals: "hnn" } }, limit: 1 });
ok("HNN is NOT a brand in this CMS", hnn.totalDocs === 0, "separate application");
const untenanted = await payload.find({
  collection: "entries", where: { tenant: { exists: false } }, limit: 0, depth: 0,
});
ok("every entry belongs to a brand", untenanted.totalDocs === 0, `${untenanted.totalDocs} orphans`);

console.log("\n§8  Metadata completeness");
const noDesc = await payload.find({
  collection: "entries", where: { description: { exists: false } }, limit: 0, depth: 0,
});
ok("every entry has a description", noDesc.totalDocs === 0, `${noDesc.totalDocs} missing`);

console.log("\n§8  Link health >= 98%, monitored nightly");
const checked = await payload.count({ collection: "entries", where: { lastChecked: { exists: true } } });
const okCount = await payload.count({ collection: "entries", where: { linkStatus: { in: ["ok", "password"] } } });
const allCount = await payload.count({ collection: "entries" });
const health = allCount.totalDocs ? (okCount.totalDocs / allCount.totalDocs) * 100 : 0;
ok("every entry has been checked", checked.totalDocs === allCount.totalDocs,
  `${checked.totalDocs}/${allCount.totalDocs}`);
ok("link health is at or above 98%", health >= 98, `${health.toFixed(1)}%`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
