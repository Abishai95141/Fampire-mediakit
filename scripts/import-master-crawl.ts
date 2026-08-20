import { readFileSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Import the collections found under the client's master events folder.
 *
 * "1. Biohack Yourself Events Master" held 1,120 folders and ~36k files the
 * original crawl never saw — the 2026 event productions, the magazine cover
 * shoots, and a dozen 2025 events with no library presence at all.
 *
 * ALL of it is imported so the catalog is complete and the team can search it,
 * but only what a journalist can actually use is PUBLISHED: a folder needs at
 * least five deliverable stills or videos, counting neither camera RAW (Drive
 * cannot even thumbnail .arw/.cr3) nor project files. Everything else lands as
 * a draft — present in the CMS, invisible to press. That keeps the fix the
 * client asked for this morning (a library that is not full of camera dumps)
 * from being undone by this import.
 *
 * CHILD SAFETY. A folder whose path names the children, the family, or "kids"
 * is flagged `containsMinor` and therefore cannot publish until a person
 * confirms it (§9.1) — regardless of how usable it looks. 13 folders match,
 * including "Love & Legend Video" and "JCCI B Roll & Kids". Flagging here is
 * a queue, not an accusation, and the direction of the error is the safe one.
 *
 *   DRY_RUN=1 npx payload run scripts/import-master-crawl.ts
 */

const DRY = process.env.DRY_RUN === "1";
const SRC =
  process.env.PROPOSAL ?? "/Users/abishaikc/Fampire/data/proposed-new-collections.json";
const PUBLISH_MIN = 5;

type Row = {
  folder_id: string; name: string; path: string; url: string;
  files: number; image: number; video: number; raw: number; doc: number; audio: number;
  dominant: string; press_ready: number;
};

const rows: Row[] = JSON.parse(readFileSync(SRC, "utf8"));
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const admin = (await api.find({
  collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true,
})).docs[0];

const brand = (await api.find({
  collection: "brands", where: { slug: { equals: "biohack-yourself" } }, limit: 1, depth: 0, overrideAccess: true,
})).docs[0];

/**
 * Names the children, the family as a unit, or children generally.
 *
 * MUST be tested against HTML-UNESCAPED text. Drive's folder listing returns
 * "Love &amp; Legend Video", and `love\s*&\s*legend` does not match that —
 * the "&" is followed by "amp;". Testing the raw string silently failed to
 * flag five folders of the children, which is the one error on this project
 * that cannot be walked back. `unesc()` below exists for that reason.
 */
const CHILD_RE =
  /(?<![A-Za-z0-9])(kids?|children|lol(?:li|ly)[ _-]*family|love\s*(?:&|and)\s*legend|legend\s*(?:&|and)\s*love|love\s+lolli|legend\s+lolli)(?![A-Za-z0-9])/i;

const unesc = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');

const ACRONYMS = new Set(["HNN","BTS","QNA","JCCI","IAOCI","UFC","A4M","MAHA","TBI","RAW","BHY","AI","TV","PR","VIP"]);
const CANON: Record<string, string> = { shealed: "sHEALed", tereza: "TereZa", biohack: "Biohack" };

const clean = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/^\s*\d+\s*[.)-]\s*/, "")                       // "23. "
    .replace(/\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b/g, " ") // dates
    .replace(/[_]+/g, " ")
    .replace(/\s*-\s*$/, "")
    .replace(/\s+/g, " ")
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

const KIND = (r: Row): string => {
  const p = unesc(r.path).toLowerCase();
  if (p.includes("cover shoot")) return "magazine";
  if (p.includes("step&repeat") || p.includes("step and repeat") || p.includes("logo")) return "logo";
  if (r.dominant === "video") return "b-roll";
  if (r.dominant === "audio") return "audio";
  if (r.dominant === "document") return "document";
  return "event photography";
};

const yearOf = (s: string): number | null => {
  const m = s.match(/\b(20\d{2})\b/) ?? s.match(/\b\d{1,2}[/.-]\d{1,2}[/.-](\d{2})\b/);
  if (!m) return null;
  const y = Number(m[1].length === 2 ? `20${m[1]}` : m[1]);
  return y >= 2015 && y <= 2030 ? y : null;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

let created = 0, published = 0, drafted = 0, flagged = 0, skipped = 0;
const seenSlug = new Set<string>();

for (const r of rows) {
  const exists = await api.find({
    collection: "entries", where: { folderId: { equals: r.folder_id } },
    limit: 1, depth: 0, overrideAccess: true, draft: true,
  });
  if (exists.docs.length) { skipped += 1; continue; }

  const pathU = unesc(r.path);
  const nameU = unesc(r.name);
  const segs = pathU.split(" / ").map((s) => s.trim()).filter(Boolean);
  const leaf = clean(nameU);
  // The event this sits under: first segment below the root that is not a
  // year-master shelf. Gives a card context instead of a bare folder name.
  const ctx = segs
    .slice(1)
    .map(clean)
    .find((s) => s && s !== leaf && !/^\d{4} Master Event/i.test(s) && s.length > 3) ?? "";

  const title = [ctx && ctx !== leaf ? ctx : "", leaf].filter(Boolean).join(" — ") || leaf || "Untitled";
  let slug = slugify(title);
  if (!slug) slug = `collection-${r.folder_id.slice(0, 8).toLowerCase()}`;
  if (seenSlug.has(slug)) slug = `${slug}-${r.folder_id.slice(0, 6).toLowerCase()}`;
  const dup = await api.find({ collection: "entries", where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true, draft: true });
  if (dup.docs.length) slug = `${slug}-${r.folder_id.slice(0, 6).toLowerCase()}`;
  seenSlug.add(slug);

  const child = CHILD_RE.test(pathU) || CHILD_RE.test(nameU);
  const usable = r.press_ready >= PUBLISH_MIN;
  const willPublish = usable && !child;
  const kind = KIND(r);
  const year = yearOf(nameU) ?? yearOf(pathU);

  const deliverable = r.image - r.raw + r.video;
  const description =
    `${kind === "b-roll" ? "B-roll" : kind === "magazine" ? "Cover shoot" : "Event photography"} — ` +
    `${r.files.toLocaleString()} files` +
    (r.raw > 0 ? ` (${r.raw.toLocaleString()} camera RAW)` : "") +
    `. From ${ctx || leaf}.`;

  if (DRY) {
    created += 1;
    if (willPublish) published += 1; else drafted += 1;
    if (child) flagged += 1;
    continue;
  }

  await api.create({
    collection: "entries",
    user: admin,
    overrideAccess: true,
    depth: 0,
    draft: !willPublish,
    data: {
      title, slug, description, kind,
      url: r.url,
      folderId: r.folder_id,
      folderPath: pathU,
      rawFolderName: nameU,
      fileCount: r.files,
      dominantMedia: r.dominant,
      mediaMix: { image: r.image, video: r.video, document: r.doc, audio: r.audio, vector: 0, other: 0 },
      sourcePlatform: "drive",
      access: "public",
      tenant: brand?.id,
      ...(year ? { year } : {}),
      minorRisk: child ? "named" : "none",
      containsMinor: child,
      containsMinorConfirmed: false,
      importDisposition: usable ? "publish" : "reject",
      holdReason: child
        ? "Names a child or the family — needs written sign-off before publishing."
        : usable ? null : `Only ${deliverable} deliverable files (rest is camera RAW or project data).`,
      _status: willPublish ? "published" : "draft",
    },
  });
  created += 1;
  if (willPublish) published += 1; else drafted += 1;
  if (child) flagged += 1;
}

console.log(`${DRY ? "[DRY RUN] " : ""}created ${created}  published ${published}  draft ${drafted}`);
console.log(`  flagged as containing a minor (held as draft): ${flagged}`);
console.log(`  skipped, folder already in the catalog: ${skipped}`);
process.exit(0);
