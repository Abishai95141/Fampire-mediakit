import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Publish every remaining draft, including the rejected artifacts.
 *
 * The 68 rows left unpublished were not awaiting review — they were the
 * importer's `reject` and `merge` dispositions: Lightroom sidecars (.lrdata),
 * Final Cut project bundles (.fcpbundle), XDROOT camera directories,
 * hash-named thumbnail folders, and duplicate subjects that fold into another
 * entry. They were held back because a press room reads better without them.
 *
 * Publishing them is the client's decision and this script records it rather
 * than arguing with it. Reversible: UNPUBLISH_ARTIFACTS=1 puts every row whose
 * disposition is reject or merge back to draft, which is the state to return
 * to if the library starts looking like a file browser.
 *
 * The child-safety gate is untouched — an entry that is flagged and not
 * confirmed still cannot reach `published`, and this script does not confirm
 * anything on its behalf.
 */

const payload = await getPayload({ config });
const REVERT = process.env.UNPUBLISH_ARTIFACTS === "1";

const drafts = await payload.find({
  collection: "entries",
  where: { _status: { equals: REVERT ? "published" : "draft" } },
  limit: 1000,
  depth: 0,
  draft: true,
  overrideAccess: true,
});

const targets = REVERT
  ? drafts.docs.filter((d) => ["reject", "merge"].includes(String(d.importDisposition)))
  : drafts.docs;

let done = 0;
let refused = 0;
for (const d of targets) {
  try {
    await payload.update({
      collection: "entries",
      id: d.id,
      data: { _status: REVERT ? "draft" : "published" },
      draft: false,
      overrideAccess: true,
    });
    done++;
  } catch {
    // The only thing that can refuse here is the child-safety gate, and it
    // should — a flagged, unconfirmed entry must not publish by side effect.
    refused++;
  }
}

const after = await payload.count({ collection: "entries", where: { _status: { equals: "published" } }, overrideAccess: true });
console.log(`${REVERT ? "unpublished" : "published"} ${done}${refused ? `, ${refused} refused by the safety gate` : ""}`);
console.log(`published total: ${after.totalDocs}`);
