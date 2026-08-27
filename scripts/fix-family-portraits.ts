import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Give the four family members their own named headshot, not a sampled frame.
 *
 * Reported: TereZa's portrait was her facing away at an event; Love's was an
 * unrelated adult seen from behind at a premiere; Legend's was Love's own
 * photo a second time. None of the four People records has `portraitUrl`
 * set, so all four fall through to `previewsForSubjects()` — which ranks
 * candidates by `kind` and picks the best-ranked entry's sampled frame.
 *
 * THE ROOT CAUSE. Each of the four has a Drive folder literally named
 * "<Name> Headshot and Bio", and each one contains an explicitly named file —
 * "Love Lolli Headshot.JPG", "TereZa Hakobyan-Lolli Headshot.JPG", etc. But
 * all three multi-person folders were classified `kind: "event photography"`
 * instead of `kind: "headshots"` (headshots ranks 0, event photography ranks
 * 2), so the ranking never preferred them — and TereZa's folder had no
 * sampled frame recorded at all. Love and Legend additionally share ONE
 * folder with ONE auto-sampled frame (a generic "IMG_2498.PNG"), so even a
 * correct kind fix could only hand that single frame to whichever child's
 * subject loop ran first — never both.
 *
 * THE FIX. Both parts, not one:
 *  1. `portraitUrl` set directly to the verified, explicitly-named headshot
 *     file for each of the four — the CMS's own designed override, "an
 *     editor's choice beats a machine's every time." This is what actually
 *     fixes the four profiles, deterministically, regardless of what any
 *     future re-sample picks.
 *  2. The three folders' `kind` corrected to `headshots` anyway — a real,
 *     separate data-correctness fix (a folder named "Headshots and Bios" IS
 *     one), independent of the People-page portraits.
 *
 * Every file id below was fetched and confirmed to render (200, image/jpeg,
 * real byte size) before being used here — see the session's diagnostic
 * output, not repeated in code.
 *
 *   DRY_RUN=1 npx payload run scripts/fix-family-portraits.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })).docs[0];

const thumb = (fileId: string) => `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;

const PORTRAITS: { slug: string; file: string; label: string }[] = [
  { slug: "anthony", file: "1XUR_YGxgX1jnRTAbnRTbD4S5m9xBQfQN", label: "Anthony Lolli Headshot.JPG" },
  { slug: "tereza", file: "1MzMeE3MYpOi6qnRYtmWbIZXKJH0quQUm", label: "TereZa Hakobyan-Lolli Headshot.JPG" },
  { slug: "love", file: "1iPx68dQeRE4490XQgZStho1saRSCFEzN", label: "Love Lolli Headshot.JPG" },
  { slug: "legend", file: "1xQvjjltqFDofdxoMA9Bmlg7i6O-Mp7GA", label: "Legend Lolli Headshot.JPG" },
];

for (const p of PORTRAITS) {
  const found = await api.find({ collection: "people", where: { slug: { equals: p.slug } }, limit: 1, depth: 0, overrideAccess: true });
  if (!found.docs.length) { console.log(`  no People record for slug "${p.slug}" — skipped`); continue; }
  console.log(`  ${p.slug} → ${p.label}`);
  if (DRY) continue;
  await api.update({
    collection: "people", id: found.docs[0].id,
    data: { portraitUrl: thumb(p.file) },
    depth: 0, overrideAccess: true, user: admin,
  });
}

/**
 * Keyed on `folderId`, NOT the local database's row id.
 *
 * Row ids are per-database and are not portable — this project has hit that
 * exact mistake before. The first version of this script hardcoded local ids
 * 570/598/599; the dry-run against production caught it immediately: 570
 * didn't exist there, and 598/599 pointed at two completely unrelated
 * entries ("Biohack Yourself Documentary Covers Vertical", "Featured in
 * Biohack Yourself +"). Had that run for real without a dry-run first, it
 * would have silently mis-tagged three unrelated production rows. folderId
 * is the client's own Drive folder id — identical in every copy of the
 * database, which is exactly why it's the field used everywhere else in this
 * codebase as the portable key.
 */
const KIND_FIXES = [
  { folderId: "1OU4UBaUC8_wBhlwlloCJXRXTqCQ12N2t", label: "Love & Legend Headshots and Bios" },
  { folderId: "1VbKZCQrnC9px23RqETYDWTc-bpS0hWM0", label: "Anthony Lolli Headshot and Bio" },
  { folderId: "1Mzhq1aiZ1eR8CJaFdfNJGpob2S5ehA_s", label: "TereZa Hakobyan-Lolli Headshot and Bio" },
];
for (const { folderId, label } of KIND_FIXES) {
  const found = await api.find({ collection: "entries", where: { folderId: { equals: folderId } }, limit: 1, depth: 0, overrideAccess: true, draft: true });
  if (!found.docs.length) { console.log(`  no entry for folder "${label}" (${folderId}) — skipped`); continue; }
  const doc = found.docs[0];
  console.log(`  entry ${doc.id} "${doc.title}": kind "${doc.kind}" → "headshots"`);
  if (DRY) continue;
  await api.update({
    collection: "entries", id: doc.id, data: { kind: "headshots" },
    depth: 0, overrideAccess: true, user: admin, draft: doc._status !== "published",
  });
}

console.log(`\n${DRY ? "[DRY RUN] " : ""}done: 4 portraits, ${KIND_FIXES.length} kind corrections`);
process.exit(0);
