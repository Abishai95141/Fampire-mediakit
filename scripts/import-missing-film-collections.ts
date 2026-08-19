import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Three films had "0 collections" on the live site: The New Woo, Skin Deep,
 * From Fat Lolli to 6 Pack Lolli. The material is not missing — it's real key
 * art sitting in Drive that two crawler bugs (documented in ~/Fampire/scripts)
 * dropped before it ever reached data/fampire/entries.json:
 *
 *   - rollup2.py's `is_collection()` requires >=4 subject letters after
 *     stripping stage words; "WOO" is 3, so "8. The New WOO" was never
 *     anchored as its own collection at all.
 *   - build-entries.mjs only processes tier A/B rows (`/^[AB]/`); "1. Fat
 *     Lolli" and "3. skinDeep" are tier C ("merge upward") and were silently
 *     dropped rather than merged anywhere.
 *
 * Re-running the full 135k-file crawl to fix this properly is out of scope
 * for three folders whose contents are already known and verified. This
 * imports exactly those three, by hand, through the same shape
 * scripts/import-entries.ts writes — folder id, real Drive URL, a preview
 * image confirmed to render via a live fetch to Drive's thumbnail endpoint
 * (content-type image/*, real byte size).
 *
 * Run: npx payload run scripts/import-missing-film-collections.ts
 */

const payload = await getPayload({ config });

const rows = [
  {
    slug: "fat-lolli-key-art",
    title: "From Fat Lolli to 6 Pack Lolli — Key Art",
    description:
      "Poster and laurel key art for Anthony Lolli's 125-pound transformation documentary.",
    folderId: "1GORHfrKxFrsBzHkKE9qN6kRPAuDw_H9h",
    rawFolderName: "1. Fat Lolli",
    filmSlug: "from-fat-lolli",
    previewFileId: "1_B00xkObH1U0KwKndl-Z5306ZjT37JI0",
    fileCount: 6,
    personSlugs: ["anthony"],
  },
  {
    slug: "skin-deep-key-art",
    title: "Skin Deep — Key Art",
    description: "Poster key art for TereZa Hakobyan-Lolli's documentary Skin Deep.",
    folderId: "1A5ZfXUO6c-EMxHQooUbAWNCd75NqPeBd",
    rawFolderName: "3. skinDeep",
    filmSlug: "skin-deep",
    previewFileId: "1LOjtKhh4ARNu2vaEdSqmHS4m6UHZaqi_",
    fileCount: 4,
    personSlugs: [],
  },
  {
    slug: "the-new-woo-key-art",
    title: "The New Woo — Key Art",
    description: "Final vertical and horizontal poster key art for The New Woo.",
    folderId: "19zmRSJoRU7QSY3PJ93FlHA5Ft2_f9Y5P",
    rawFolderName: "8. The New WOO",
    filmSlug: "the-new-woo",
    previewFileId: "1LXxP-eFGwJWRyXktcM7ZYK342kRyMBXE",
    fileCount: 4,
    personSlugs: [],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

for (const row of rows) {
  const filmDoc = await api.find({
    collection: "films",
    where: { slug: { equals: row.filmSlug } },
    limit: 1,
    depth: 0,
  });
  if (!filmDoc.docs.length) {
    console.error(`✗ ${row.slug}: no film with slug ${row.filmSlug}, skipping`);
    continue;
  }
  const filmId = filmDoc.docs[0].id;

  const people: number[] = [];
  for (const s of row.personSlugs) {
    const p = await api.find({ collection: "people", where: { slug: { equals: s } }, limit: 1, depth: 0 });
    if (p.docs.length) people.push(p.docs[0].id);
  }

  const existing = await api.find({
    collection: "entries",
    where: { folderId: { equals: row.folderId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = {
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: "poster",
    url: `https://drive.google.com/drive/folders/${row.folderId}`,
    film: filmId,
    people,
    folderId: row.folderId,
    folderPath: row.rawFolderName,
    rawFolderName: row.rawFolderName,
    duplicateFolders: 0,
    previewFileId: row.previewFileId,
    fileCount: row.fileCount,
    dominantMedia: "image",
    sourcePlatform: "drive",
    access: "public",
    minorRisk: "none",
    containsMinor: false,
    containsMinorConfirmed: false,
    importDisposition: "publish",
    _status: "published",
  };

  if (existing.docs.length) {
    await api.update({ collection: "entries", id: existing.docs[0].id, data, depth: 0, overrideAccess: true });
    console.log(`↻ updated ${row.slug} (id ${existing.docs[0].id})`);
  } else {
    const created = await api.create({ collection: "entries", data, depth: 0, overrideAccess: true });
    console.log(`✓ created ${row.slug} (id ${created.id})`);
  }
}

console.log("done");
process.exit(0);
