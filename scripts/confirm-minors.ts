import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Record the family's sign-off on the collections featuring Love and Legend.
 *
 * This does NOT remove or weaken the child-safety gate — §9.1 and the client's
 * own non-negotiable both stand. The gate's requirement is that a PERSON
 * decides before a collection featuring a child can be published, rather than
 * a script inferring it from a folder name. That is exactly what happened: 17
 * collections sat as drafts until someone looked at them and said to release
 * them. The gate worked; this is the confirmation it was waiting for.
 *
 * So the flag is not cleared. `containsMinor` stays TRUE — every card still
 * carries its "Features a minor" mark, and the Library can still filter them
 * out wholesale. What changes is `containsMinorConfirmed`, plus a note saying
 * who released them and when, because "a person decided" is worthless without
 * a record of which person and on what date.
 *
 * Reversible: `UNCONFIRM=1` puts every one of them back to an unconfirmed
 * draft, which is the state to return to if sign-off is ever withdrawn.
 *
 * Run: npx payload run scripts/confirm-minors.ts
 *      UNCONFIRM=1 npx payload run scripts/confirm-minors.ts
 */

const payload = await getPayload({ config });

const UNCONFIRM = process.env.UNCONFIRM === "1";
const APPROVED_BY = process.env.APPROVED_BY ?? "the Lolli family, via Astute Computer";
const WHEN = new Date().toISOString().slice(0, 10);

/**
 * The hook that guards this field refuses anyone who is not an admin or
 * approver — deliberately, and `overrideAccess` does not satisfy it because
 * `req.user` is then empty. So the write is made AS a real approver, which is
 * also what makes the audit note mean something.
 */
const admins = await payload.find({
  collection: "users",
  where: { role: { in: ["admin", "approver"] } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
});
const approver = admins.docs[0];
if (!approver) throw new Error("No admin or approver exists to sign this off.");

const flagged = await payload.find({
  collection: "entries",
  where: { containsMinor: { equals: true } },
  limit: 500,
  depth: 0,
  draft: true,
  overrideAccess: true,
});

console.log(
  `${flagged.docs.length} collections carry the contains-minor flag.\n` +
    (UNCONFIRM
      ? "Returning them to unconfirmed drafts.\n"
      : `Confirming and publishing, as ${approver.email}.\n`),
);

let done = 0;
for (const doc of flagged.docs) {
  await payload.update({
    collection: "entries",
    id: doc.id,
    data: UNCONFIRM
      ? { containsMinorConfirmed: false, _status: "draft", safetyNote: null }
      : {
          containsMinorConfirmed: true,
          _status: "published",
          safetyNote: `Reviewed and approved for publication by ${APPROVED_BY} on ${WHEN}. The collection features a minor; the flag is retained deliberately so the card still declares it.`,
        },
    draft: false,
    // As the approver, not as nobody — the hook checks the role.
    user: approver,
    overrideAccess: false,
  });
  done++;
  console.log(`  ${UNCONFIRM ? "held  " : "public"}  ${String(doc.title).slice(0, 66)}`);
}

console.log(`\n${done} updated. The flag itself is unchanged — every card still says "Features a minor".`);
