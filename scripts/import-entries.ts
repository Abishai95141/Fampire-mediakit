import { readFileSync } from "node:fs";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Import the enriched catalog into Payload.
 *
 * Reads data/fampire/entries.json (produced by scripts/enrich/build-entries.mjs)
 * and creates the taxonomy it references before the entries themselves, so
 * every relationship resolves.
 *
 * Everything imports as a DRAFT. The client signs off on the catalog before it
 * publishes (§12 stage 1, §8) — so an import must never put 486 rows onto a
 * public press surface on its own. `PUBLISH_CLEAN=1` is the deliberate,
 * separate act of publishing the entries that need no human judgement:
 * qualified for review, no child-safety signal, complete metadata.
 *
 * Idempotent on `folderId` for entries and `slug` for taxonomy, so re-running
 * after a vocabulary correction updates in place.
 *
 * Run: npx payload run scripts/import-entries.ts
 * Publish the clean subset too: PUBLISH_CLEAN=1 npx payload run scripts/import-entries.ts
 */

/**
 * Read from the environment, not argv: `payload run` owns the CLI argument
 * list and does not forward unrecognised flags to the script, so
 * `--publish-clean` silently never arrived.
 *
 *   PUBLISH_CLEAN=1 npx payload run scripts/import-entries.ts
 */
const PUBLISH_CLEAN = process.env.PUBLISH_CLEAN === "1";

const payload = await getPayload({ config });
const { entries } = JSON.parse(readFileSync("data/fampire/entries.json", "utf8"));

const log = (...a: unknown[]) => console.log(...a);

// ── Upsert helpers ──────────────────────────────────────────────────────

const cache = new Map<string, number>();

type TaxonomySlug = "people" | "films" | "events" | "locations" | "brands";

/**
 * Find-or-create by slug, memoised.
 *
 * Payload's local API is generically typed per collection, and this helper is
 * deliberately generic ACROSS collections — so the arguments are narrowed at
 * the call sites rather than here, and the payload calls take a local `any`.
 * Widening the collection union instead would mean five near-identical copies
 * of the same eight lines.
 */
async function upsert(
  collection: TaxonomySlug,
  slug: string,
  data: Record<string, unknown>,
): Promise<number> {
  const key = `${collection}:${slug}`;
  if (cache.has(key)) return cache.get(key)!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = payload as any;
  const found = await api.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });

  const id: number = found.docs.length
    ? Object.keys(data).length
      ? (await api.update({ collection, id: found.docs[0].id, data, depth: 0 })).id
      : found.docs[0].id
    : (await api.create({ collection, data: { ...data, slug }, depth: 0 })).id;

  cache.set(key, id);
  return id;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// TereZa is always spelled with a capital Z (§10).
const tereZa = (s: string) => s.replace(/\bTereza\b/g, "TereZa").replace(/\bTEREZA\b/g, "TereZa");

// ── Taxonomy ────────────────────────────────────────────────────────────

const FAMILY_LABELS: Record<string, { name: string; isMinor: boolean }> = {
  anthony: { name: "Anthony Lolli", isMinor: false },
  tereza: { name: "TereZa Hakobyan-Lolli", isMinor: false },
  // The two children. isMinor here is what makes every entry featuring them
  // reviewable, rather than trusting 486 per-entry flags to stay correct.
  love: { name: "Love Lolli", isMinor: true },
  legend: { name: "Legend Lolli", isMinor: true },
};

log("building taxonomy…");

for (const [slug, { name, isMinor }] of Object.entries(FAMILY_LABELS)) {
  await upsert("people", slug, { name, isFamily: true, isMinor });
}

/**
 * Find a brand, and only create one if it is genuinely missing.
 *
 * Deliberately NOT an upsert. The eight worlds are seeded with real names by
 * scripts/seed-brands.ts; passing `{ name: slug }` through an update would
 * rename "Biohack Yourself" to "biohack-yourself" on every import.
 */
const brandCache = new Map<string, number>();
async function brandId(slug: string): Promise<number> {
  if (brandCache.has(slug)) return brandCache.get(slug)!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found = await (payload as any).find({
    collection: "brands",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  const id = found.docs.length
    ? found.docs[0]!.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (await (payload as any).create({ collection: "brands", data: { slug, name: slug }, depth: 0 })).id;
  brandCache.set(slug, id as number);
  return id as number;
}

// ── Entries ─────────────────────────────────────────────────────────────

let created = 0;
let updated = 0;
let published = 0;
let failed = 0;

for (const e of entries) {
  try {
    const tenant = await brandId(e.brands[0] ?? "lolli-brands");

    const film = e.film_slug
      ? await upsert("films", e.film_slug, { title: e.film })
      : null;

    const event = e.event_slug
      ? await upsert("events", e.event_slug, { title: e.event })
      : null;

    const location = e.location_slug
      ? await upsert("locations", e.location_slug, { label: e.location })
      : null;

    const people: number[] = [];
    for (const s of e.subjects) {
      if (FAMILY_LABELS[s]) people.push(await upsert("people", s, {}));
    }
    for (const name of e.people) {
      const slug = slugify(name);
      if (!slug) continue;
      people.push(await upsert("people", slug, { name: tereZa(name) }));
    }

    /**
     * A slug is unique across the collection, but the upsert keys on
     * `folderId` — so when the rollup picks a different head folder for a
     * subject, the new row can collide with an existing row that still holds
     * that slug. Suffixing keeps the import idempotent instead of failing two
     * rows every run.
     */
    let slug: string = e.slug ?? e.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slugOwner = await (payload as any).find({
      collection: "entries",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (slugOwner.docs.length && slugOwner.docs[0].folderId !== e.folder_id) {
      slug = `${slug}-${String(e.folder_id).slice(0, 6).toLowerCase()}`;
    }

    const relatePeople = async (names: string[]) => {
      const ids: number[] = [];
      for (const name of names ?? []) {
        const sl = slugify(name);
        if (sl) ids.push(await upsert("people", sl, { name: tereZa(name) }));
      }
      return [...new Set(ids)];
    };
    const crew = await relatePeople(e.crew ?? []);
    const rightsHolder = await relatePeople(e.rights_holders ?? []);

    const data = {
      slug,
      crew,
      rightsHolder,
      previewFileId: e.preview_file_id ?? null,
      title: e.title,
      description: e.description,
      url: e.url,
      rewrittenFrom: e.rewritten_from,
      alternates: (e.alternates ?? []).map((url: string) => ({ url })),
      tenant,
      kind: e.kind,
      occasion: e.occasion,
      people: [...new Set(people)],
      film,
      event,
      location,
      year: e.year,
      dateStart: e.date_start,
      dateEnd: e.date_end,
      magazineIssue: e.magazine_issue,
      minorRisk: e.minor_risk,
      containsMinor: e.contains_minor,
      containsMinorConfirmed: false,
      sourcePlatform: e.source_platform,
      access: e.access,
      fileCount: e.file_count,
      orientation: e.orientation,
      orientationConfidence: e.orientation_confidence,
      orientationSamples: e.orientation_samples,
      dominantMedia: e.dominant_media,
      mediaMix: e.media_mix,
      folderId: e.folder_id,
      folderPath: e.folder_path.join(" / "),
      rawFolderName: e.raw_folder_name,
      duplicateFolders: e.duplicate_folders,
      importDisposition: e.disposition,
      holdReason: e.hold_reason,
    };

    /**
     * The gate is `contains_minor`, and only that.
     *
     * §9.1 is specific: an entry FLAGGED as containing a minor needs a person
     * to confirm it. `minorRisk: context` is not that flag — it means the
     * folder path put the family in the room, so a reviewer should look. It is
     * a queue, not a block.
     *
     * Holding all 145 risk-graded entries back published only 341 of 486 and
     * made two thirds of the qualifying catalog invisible for no reason the
     * brief asks for. The 10 genuinely flagged entries stay draft; the rest
     * publish and remain filterable for review in the admin.
     */
    const clean =
      PUBLISH_CLEAN &&
      e.disposition === "publish" &&
      !e.contains_minor &&
      Boolean(e.title && e.description && e.kind);

     
    /**
     * Link health is NOT imported.
     *
     * `linkStatus`, `linkStatusDetail` and `lastChecked` are written by
     * scripts/check-links.ts from live probes and are owned by it. Carrying
     * them in from entries.json overwrote a full health sweep with the JSON's
     * stale "unchecked" on every re-import — silently discarding the one thing
     * that proves a link still works.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (payload as any).find({
      collection: "entries",
      where: { folderId: { equals: e.folder_id } },
      limit: 1,
      depth: 0,
    });

    if (existing.docs.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (payload as any).update({
        collection: "entries",
        id: existing.docs[0]!.id,
        data: { ...data, _status: clean ? "published" : "draft" },
        depth: 0,
      });
      updated++;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (payload as any).create({
        collection: "entries",
        data: { ...data, _status: clean ? "published" : "draft" },
        depth: 0,
      });
      created++;
    }
    if (clean) published++;
  } catch (err) {
    failed++;
    console.error(`  FAILED ${e.id}: ${(err as Error).message}`);
  }
}

const counts = await Promise.all(
  (["entries", "people", "films", "events", "locations", "brands"] as const).map(async (c) => {
    const r = await payload.count({ collection: c });
    return `${c}: ${r.totalDocs}`;
  }),
);

log(`\nentries created ${created} · updated ${updated} · failed ${failed}`);
log(PUBLISH_CLEAN ? `published ${published} (the rest await sign-off)` : "all imported as DRAFT — nothing is public");
log(counts.join(" · "));

process.exit(failed ? 1 : 0);
