import { writeFileSync, mkdirSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * One collection per (event × kind), instead of one per camera roll.
 *
 * SunScreen Film Festival was 17 cards: nine of them per-camera folders
 * (`A_Cam_1_Lolli_Family_Opening`, `B_Cam_3_BTS_QNA`…), two machine
 * artifacts, six real. A producer searching "The Guru" got a wall of camera
 * assignments instead of "here is the premiere".
 *
 * The pipeline already knew. Those nine carry `importDisposition: "merge"` —
 * scripts/enrich/derive.mjs classifies them as "real content at the wrong
 * granularity". The diagnosis shipped; the merge never did. They sat as
 * drafts until a bulk publish put them on the public site as separate cards.
 * This is that missing step.
 *
 * Grain is event × KIND, not event alone: "event photography" and "b-roll"
 * are genuinely different requests, so collapsing them together would trade
 * one kind of unusable for another.
 *
 * NOTHING IS LOST. Every absorbed folder's URL becomes an `alternate` on the
 * survivor — the field that already exists for exactly this (324 subjects
 * were stored in more than one folder and were collapsed the same way). Every
 * Drive folder stays one click from the card. Every absorbed row is also
 * written to data/audit/ before deletion.
 *
 * Safety: `containsMinor` is the OR of the group. The merged entry counts as
 * confirmed only if every source that was flagged had ALSO been confirmed by
 * a person — the merged claim is then exactly the claim a human already
 * reviewed. If any flagged source was unconfirmed, the survivor goes to draft
 * rather than inheriting a confirmation nobody gave.
 *
 *   DRY_RUN=1 npx payload run scripts/consolidate-events.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

// Merging can re-assert an existing human confirmation, which the collection
// restricts to approvers. Run as one.
const admin = (await api.find({
  collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true,
})).docs[0];
if (!admin) throw new Error("no admin user to run as");

const KIND_LABEL: Record<string, string> = {
  "b-roll": "B-roll", "event photography": "Event photography", headshots: "Headshots",
  poster: "Poster", logo: "Logos", trailer: "Trailer", BTS: "Behind the scenes",
  podcast: "Podcast", press: "Press", magazine: "Magazine", document: "Documents",
  interview: "Interviews", audio: "Audio",
};
const MONTH = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const RISK_ORDER = ["none", "context", "named"];

const events = await api.find({ collection: "events", limit: 500, depth: 0, overrideAccess: true });
const eventTitle = new Map<number, string>(
  (events.docs as { id: number; title?: string }[]).map((e) => [e.id, String(e.title ?? "")]),
);

const all = await api.find({
  collection: "entries", limit: 3000, depth: 0, overrideAccess: true, draft: true,
});

// Group by event × kind.
const groups = new Map<string, Record<string, unknown>[]>();
for (const e of all.docs as Record<string, unknown>[]) {
  if (!e.event) continue;
  const ev = typeof e.event === "object" ? (e.event as { id: number }).id : (e.event as number);
  /**
   * YEAR is part of the grain, not decoration.
   *
   * One event record can be a recurring event: "SunScreen Film Festival"
   * covers both The Guru premiere (April 2024) and the Biohack premiere
   * (April 2025). Grouping on event × kind alone fused two different
   * festivals a year apart into one card — and dated it 2025 while it held
   * 2024 material. Two editions of an annual event are two events to anyone
   * looking for either.
   */
  const key = `${ev}::${String(e.kind ?? "")}::${String(e.year ?? "")}`;
  (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
}

const ids = (v: unknown): number[] =>
  ((v ?? []) as (number | { id: number })[]).map((x) => (typeof x === "object" && x ? x.id : x)).filter(Boolean) as number[];

/** Machine-shaped folder names make bad survivors — prefer a human one. */
const machineish = (s: string) => /_|[A-Z]{4,}|[0-9A-F]{8,}/.test(s);

const backup: Record<string, unknown>[] = [];
const plan: { survivor: string; absorbs: number; files: number; title: string }[] = [];
let deleted = 0;

for (const [key, rows] of groups) {
  if (rows.length < 2) continue;
  const evId = Number(key.split("::")[0]);
  const kind = key.split("::")[1];
  const evName = eventTitle.get(evId) ?? "";

  // Survivor: a published, human-named, file-heavy row.
  const ranked = [...rows].sort((a, b) => {
    const pub = (r: Record<string, unknown>) => (r.importDisposition === "publish" ? 0 : 1);
    if (pub(a) !== pub(b)) return pub(a) - pub(b);
    const mach = (r: Record<string, unknown>) => (machineish(String(r.rawFolderName ?? "")) ? 1 : 0);
    if (mach(a) !== mach(b)) return mach(a) - mach(b);
    return Number(b.fileCount ?? 0) - Number(a.fileCount ?? 0);
  });
  const survivor = ranked[0];
  const absorbed = ranked.slice(1);

  const files = rows.reduce((n, r) => n + Number(r.fileCount ?? 0), 0);
  const people = [...new Set(rows.flatMap((r) => ids(r.people)))];
  const crew = [...new Set(rows.flatMap((r) => ids(r.crew)))];
  const rightsHolder = [...new Set(rows.flatMap((r) => ids(r.rightsHolder)))];

  const alternates = [
    ...new Set([
      ...((survivor.alternates ?? []) as { url: string }[]).map((a) => a.url),
      ...absorbed.flatMap((r) => [
        String(r.url ?? ""),
        ...((r.alternates ?? []) as { url: string }[]).map((a) => a.url),
      ]),
    ]),
  ].filter((u) => u && u !== survivor.url);

  const flagged = rows.filter((r) => r.containsMinor === true);
  const containsMinor = flagged.length > 0;
  const allConfirmed = flagged.every((r) => r.containsMinorConfirmed === true);
  const risk = RISK_ORDER[Math.max(...rows.map((r) => Math.max(0, RISK_ORDER.indexOf(String(r.minorRisk ?? "none")))))];

  const preview =
    rows.find((r) => r.previewUrl)?.previewUrl ?? null;
  const previewFileId =
    survivor.previewFileId ?? rows.find((r) => r.previewFileId)?.previewFileId ?? null;

  const d = survivor.dateStart ? new Date(String(survivor.dateStart)) : null;
  const when = d && !isNaN(d.getTime()) ? `, ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : survivor.year ? `, ${survivor.year}` : "";
  const label = KIND_LABEL[kind] ?? kind;
  const title = `${evName} — ${label}${when}`;
  const noun = kind === "b-roll" || kind === "trailer" ? "files" : "images";
  const description = `${label} — ${files.toLocaleString()} ${noun} across ${rows.length} folders. From ${evName}.`;

  plan.push({ survivor: String(survivor.title ?? ""), absorbs: absorbed.length, files, title });
  if (DRY) continue;

  backup.push(...absorbed.map((r) => ({ ...r })));

  await api.update({
    collection: "entries",
    id: survivor.id,
    user: admin,
    overrideAccess: true,
    depth: 0,
    draft: containsMinor && !allConfirmed,
    data: {
      title,
      description,
      fileCount: files,
      people, crew, rightsHolder,
      alternates: alternates.map((url) => ({ url })),
      duplicateFolders: rows.length,
      containsMinor,
      containsMinorConfirmed: containsMinor ? allConfirmed : false,
      minorRisk: risk,
      ...(preview ? { previewUrl: preview } : {}),
      ...(previewFileId ? { previewFileId } : {}),
      ...(containsMinor && !allConfirmed ? { _status: "draft" } : {}),
    },
  });

  for (const r of absorbed) {
    await api.delete({ collection: "entries", id: r.id, user: admin, overrideAccess: true });
    deleted += 1;
  }
}

if (!DRY) {
  mkdirSync("data/audit", { recursive: true });
  writeFileSync("data/audit/consolidated-absorbed-rows.json", JSON.stringify(backup, null, 2));
}

plan.sort((a, b) => b.absorbs - a.absorbs);
console.log(`${DRY ? "[DRY RUN] " : ""}groups consolidated: ${plan.length}`);
console.log(`${DRY ? "would absorb" : "absorbed"}: ${plan.reduce((n, p) => n + p.absorbs, 0)} rows${DRY ? "" : ` (deleted ${deleted}, backed up to data/audit/)`}\n`);
for (const p of plan.slice(0, 15)) console.log(`  −${String(p.absorbs).padStart(2)}  ${p.title}  (${p.files.toLocaleString()} files)`);
process.exit(0);
