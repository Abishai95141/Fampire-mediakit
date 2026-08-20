import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Give the imported collections their events, so they group and filter.
 *
 * The 507 collections imported from the master events folder all landed with
 * no `event`, which meant a whole year of material could not be browsed the
 * way 2024 and 2025 can. Their event is right there in the folder path — the
 * client files everything as
 *
 *   1. Biohack Yourself Events Master
 *     / 2026 Master Event Deliverables
 *       / 2026 Event Productions          <- a shelf, not an event
 *         / 14. 05.12.26 sHEALed Cannes Premiere   <- the event
 *           / May 15th sHEALed Premiere            <- a part of it
 *
 * so the event is the segment below the year shelf, skipping the
 * "<year> Event Productions" shelf where one exists.
 *
 * Also RETITLES: those cards currently read "2026 Event Productions — May 15th
 * General BTS", naming a filing shelf. With the event known they become
 * "sHEALed Cannes Premiere — May 15th General BTS", which is what someone
 * searching for the premiere would actually recognise.
 *
 * Magazine cover shoots are NOT events — "1. Issue #3 - Lara Trump Cover
 * Shoot" is an issue. Those get `magazineIssue` set from the issue number and
 * are deliberately left without an event.
 *
 *   DRY_RUN=1 npx payload run scripts/derive-events.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (await api.find({
  collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true,
})).docs[0];

const ACRONYMS = new Set(["HNN","BTS","QNA","JCCI","IAOCI","IAOMT","UFC","A4M","MAHA","TBI","NYC","AI","TV","PR","VIP","M"]);
const CANON: Record<string, string> = { shealed: "sHEALed", tereza: "TereZa", biohack: "Biohack" };

/** "14. 05.12.26 sHEALed Cannes Premiere" -> "sHEALed Cannes Premiere" */
const cleanEvent = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/^\s*\d+\s*[.)-]\s*/, "")   // the filing number, "14. "
    /**
     * Then strip the WHOLE leading run of digits and separators, rather than
     * matching date shapes one at a time. The client writes dates a dozen
     * ways — "05.12.26", "05.11-12", "10/10-11/2025", "11/16/ 2025" (note the
     * space), "5/2025" — and pattern-per-shape left "2025 - Eudemonia",
     * "25 - Women In Wellness Conference" and "2025 - JCCI Congress - Kids"
     * as event names. Anything before the first letter is filing metadata.
     */
    .replace(/^[\d\s.\/–—-]+/, "")
    .replace(/'\d{2}\b/g, " ")
    .replace(/^[\s*\-–—/,.:;]+/, "")
    .replace(/[\s\-–—/,.:;]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(" ")
    .map((w) => {
      const k = w.toLowerCase().replace(/[^a-z]/g, "");
      if (CANON[k]) return CANON[k];
      if (ACRONYMS.has(w.toUpperCase().replace(/[^A-Z0-9]/g, ""))) return w.toUpperCase();
      if (/[a-z]/.test(w) && /[A-Z]/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** First real date in a folder segment, as an ISO day. */
function dateOf(seg: string, fallbackYear: number | null): string | null {
  let m = seg.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/);
  if (m) {
    const [, a, b, c] = m;
    const y = c.length === 2 ? 2000 + Number(c) : Number(c);
    const d = new Date(Date.UTC(y, Number(a) - 1, Number(b)));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  m = seg.match(/\b(\d{1,2})\/(\d{1,2})(?:-\d{1,2})?\/?\s?(\d{2,4})\b/);
  if (m) {
    const [, a, b, c] = m;
    const y = c.length === 2 ? 2000 + Number(c) : Number(c);
    const d = new Date(Date.UTC(y, Number(a) - 1, Number(b)));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (fallbackYear) return new Date(Date.UTC(fallbackYear, 0, 1)).toISOString();
  return null;
}

const entries = await api.find({
  collection: "entries", limit: 3000, depth: 0, overrideAccess: true, draft: true,
});

const eventCache = new Map<string, number>();
async function eventId(title: string, when: string | null): Promise<number> {
  const slug = slugify(title);
  if (eventCache.has(slug)) return eventCache.get(slug)!;
  const found = await api.find({ collection: "events", where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs.length) { eventCache.set(slug, found.docs[0].id); return found.docs[0].id; }
  if (DRY) { eventCache.set(slug, -1); return -1; }
  const made = await api.create({
    collection: "events",
    data: { title, slug, ...(when ? { dateStart: when } : {}) },
    depth: 0, overrideAccess: true, user: admin,
  });
  eventCache.set(slug, made.id);
  return made.id;
}

let linked = 0, retitled = 0, issues = 0;
const madeEvents = new Set<string>();

for (const e of entries.docs as Record<string, unknown>[]) {
  const path = String(e.folderPath ?? "");
  if (!path.includes("Biohack Yourself Events Master")) continue;
  const segs = path.split(" / ").map((s) => s.trim()).filter(Boolean);

  // Magazine cover shoots: an ISSUE, never an event.
  const issueSeg = segs.find((s) => /Issue\s*#\s*\d+/i.test(s));
  if (issueSeg) {
    const n = Number(issueSeg.match(/Issue\s*#\s*(\d+)/i)![1]);
    /**
     * Title from the ISSUE and its subject, not from the shelf.
     *
     * "7. Issue #10 - Dr. Shefali Shoot" is filed under
     * "**Biohack Yourself Magazine Cover Shoots - Adam" — a crew member's
     * working shelf — so cards were reading "Biohack Yourself Magazine Cover
     * Shoots - Adam — JPGs". Nobody searches for that. The issue number and
     * the cover subject are what a press contact knows.
     */
    const subject = cleanEvent(
      issueSeg.replace(/^\s*\d+\s*[.)-]\s*/, "").replace(/Issue\s*#\s*\d+\s*[-–—]?\s*/i, "").replace(/\b(cover\s*)?shoot\b/i, ""),
    );
    const ctx = `Issue #${n}${subject ? ` — ${subject}` : ""}`;
    const oldT = String(e.title ?? "");
    const tailParts = oldT.split(" — ");
    const tail = tailParts.length > 1 ? tailParts.slice(1).join(" — ") : "";
    const nextT = tail && tail.toLowerCase() !== subject.toLowerCase() ? `${ctx} — ${tail}` : ctx;

    const data: Record<string, unknown> = {};
    if (!e.magazineIssue && n) data.magazineIssue = n;
    if (nextT && nextT !== oldT) data.title = nextT;
    if (Object.keys(data).length) {
      issues += 1;
      if (!DRY) {
        await api.update({
          collection: "entries", id: e.id, data,
          depth: 0, overrideAccess: true, user: admin, draft: e._status !== "published",
        });
      }
    }
    continue;
  }

  const shelfIdx = segs.findIndex((s) => /Master Event Deli?l?verables/i.test(s));
  if (shelfIdx < 0) continue;
  let rest = segs.slice(shelfIdx + 1);
  if (rest.length > 1 && /Event Productions$/i.test(rest[0])) rest = rest.slice(1);
  if (!rest.length) continue;

  const rawEvent = rest[0];
  const title = cleanEvent(rawEvent);
  if (!title || title.length < 3) continue;

  const year = Number(String(segs[shelfIdx]).match(/\b(20\d{2})\b/)?.[1] ?? "") || null;
  const evId = await eventId(title, dateOf(rawEvent, year));
  madeEvents.add(title);

  // Retitle away from the filing shelf, toward the event.
  const oldTitle = String(e.title ?? "");
  const parts = oldTitle.split(" — ");
  const tail = parts.length > 1 ? parts.slice(1).join(" — ") : parts[0];
  const nextTitle =
    tail && tail.toLowerCase() !== title.toLowerCase() ? `${title} — ${tail}` : title;

  const data: Record<string, unknown> = {};
  // evId is -1 under DRY_RUN (no event row is created), so count the intent
  // rather than the id — otherwise a dry run always reports "linked: 0" and
  // looks like the pass does nothing.
  if (!e.event) { linked += 1; if (evId > 0) data.event = evId; }
  if (nextTitle !== oldTitle) { data.title = nextTitle; retitled += 1; }
  if (!Object.keys(data).length) continue;

  if (!DRY) {
    await api.update({
      collection: "entries", id: e.id, data,
      depth: 0, overrideAccess: true, user: admin, draft: e._status !== "published",
    });
  }
}

console.log(`${DRY ? "[DRY RUN] " : ""}events referenced: ${madeEvents.size}`);
console.log(`  entries linked to an event: ${linked}`);
console.log(`  entries retitled to name the event: ${retitled}`);
console.log(`  cover shoots given a magazine issue: ${issues}`);
console.log(`\n${[...madeEvents].sort().slice(0, 25).map((t) => "  " + t).join("\n")}`);
process.exit(0);
