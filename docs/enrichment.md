# Enrichment — what was derived, and what a human still owes

How the audit's 559 Tier A rows became a filterable catalog, and where the
derivation stops. Written for whoever runs client sign-off.

## The pipeline

```bash
node scripts/enrich/extract-sources.mjs     # audit slices → data/audit/ (4 MB, not 15)
node scripts/enrich/sample-orientation.mjs  # ~2,700 thumbnail reads → orientation.json
node scripts/enrich/build-entries.mjs       # → entries.json + two review CSVs
npx payload migrate
npx payload run scripts/seed-brands.ts    # the eight worlds
npx payload run scripts/import-entries.ts # all 559, as DRAFT
npx payload run scripts/verify-catalog.ts # 13 invariants against live data
```

To also publish the entries that need no human judgement:

```bash
PUBLISH_CLEAN=1 npx payload run scripts/import-entries.ts
```

Everything is idempotent. Correct a vocabulary list in
`scripts/enrich/vocab.mjs`, re-run, and entries update in place.

## Where the metadata comes from

All of it from the **folder path** — never a filename. Across all 135,611
files, 59% of filenames are camera defaults and person names appear in 0.1%
(§7.4). Ancestry is reconstructed from the crawl's parent edges: 559/559
resolved.

## Coverage, measured

Across the 486 entries that qualify for review:

| Field | Coverage | Note |
|---|---|---|
| title, description, kind, brand | 100% | |
| named people | 59% | 150 distinct, mostly the `Dr. X Y` pattern |
| film | 68% | |
| year / exact date | 34% | most folders carry no date at all |
| occasion | 28% | |
| event | 23% | |
| location | 5% | folders rarely name a place |
| magazine issue | 5% | issues #1–#8 |

**Low coverage is a fact about the folder names, not a bug.** A folder called
`Chani Cuts` has no date in it and no amount of parsing will invent one. The
gaps are where the media team's knowledge is genuinely required.

## Two axes, not one

The audit spoke 18 kinds; the front end's contract speaks 11. Collapsing 18
into 11 would have thrown away real filter value, so the vocabulary split in
two:

- **`kind`** — what the asset IS. The original 11 plus `interview` and `audio`.
- **`occasion`** — what it came FROM: premiere, book signing, clinic
  production, conference, cover shoot, roundtable, speaking, festival,
  interview, workout, podcast.

That is what makes "video from a book signing" a query rather than a browse.
Adding to `kind` is safe: the front end looks kinds up with fallbacks
(`KIND_ALIASES[e.kind]`, `KIND_RANK[a.kind] ?? 9`), so an unknown kind degrades
instead of breaking.

## 73 entries do not publish

The audit promoted rows to Tier A that are machine output, including a
**2,118-file Lightroom preview cache**. Three dispositions now:

| | Count | Meaning |
|---|---|---|
| `publish` | 486 | Qualifies for review |
| `reject` | 60 | Final Cut bundles, `.lrdata`, `THMBNL`, `PRIVATE`, hashed render dirs, camera reels |
| `merge` | 13 | Real content at the wrong granularity — per-camera dumps (`A_Cam_1_*`), `ARCHIVE` copies |

`merge` rows are not junk. Their content belongs inside the parent subject's
entry; they just should not be their own row. See `data/fampire/entries-held.csv`.

## Child safety — read this part

§9.1 calls a false negative here unrecoverable. Two things you need to know.

**The folder names do not carry the signal.** "love" and "legend" appear in 4
folder names each across 486 entries; "kids" in 1. The build plan says the two
children "appear throughout the library" — and both statements are true. They
are in the *content*; the *names* do not say so.

So a binary flag drafted from paths under-reports badly. Shipping only that
would tell a reviewer the other 476 are clear, which is not something the data
supports. Instead there is a graded `minorRisk`:

| | Count | Meaning |
|---|---|---|
| `named` | 10 | A child is named, or a kids/family hint fired |
| `context` | 135 | A setting the family attends together — a premiere, a festival, a book signing, a Lolli-named shoot, or a parent already identified |
| `none` | 341 | No signal either way. **Not a clearance** — it means the path told us nothing |

**145 entries need a person to look at them**, not 10.

Two enforcement points, both verified against live data:

1. `Entries.beforeChange` refuses to publish a flagged, unconfirmed entry —
   tested with `overrideAccess: true`, i.e. it holds against an admin.
2. Only an approver or admin may tick `containsMinorConfirmed`.

`PUBLISH_CLEAN=1` publishes only `minorRisk: none`, so all 145 stay draft.
That is why `occasion=book-signing` currently returns nothing publicly — every
book signing is `context` and awaiting review. Working as designed.

## Bugs found and fixed here

Worth knowing, because each was silent.

- **`\b` does not match across underscores.** `_` is a word character, so
  `/\bfamily\b/` never matched `A_Cam_1_Lolli_Family_Opening` — suppressing the
  child-safety flag on every underscore-named folder. Fixed once, in `hay()`,
  for every derivation.
- **`11/13-15/2025` parsed as month 15.** The cross-month date pattern read the
  range end as a month and emitted `2025-15-20`. 64 entries failed to import.
  `iso()` now rejects impossible dates and the caller falls through to the next
  pattern. All nine real date formats verified.
- **`status` collided with Payload's `_status`.** Both generate the Postgres
  enum `enum_entries_status`, so the migration declared the column with the
  draft enum `('draft','published')` and a default of `'unchecked'`. Renamed to
  `linkStatus`.
- **The brand upsert clobbered names.** Passing `{ name: slug }` through an
  update renamed "Biohack Yourself" to "biohack-yourself" on every import. It
  is now find-or-create.

## Orientation — sampled, not guessed

`scripts/enrich/sample-orientation.mjs` fetches thumbnails from Drive and reads
their aspect ratios with sharp. Orientation is one of only two fields that
cannot come from a path: you have to look at pixels.

Result across the 486 publishable entries: **90% sampled** — 301 landscape,
138 portrait, 8 square, 7 mixed. Vertical b-roll filtering works:

```
/payload-api/entries?where[kind][equals]=b-roll&where[orientation][equals]=portrait
→ 46 published collections, no login
```

A collection is `portrait` only when ≥60% of its sampled frames are; anything
less is `mixed`, which is the honest answer — an editor who needs vertical
should not be sent to a folder that is half landscape. `orientationConfidence`
and `orientationSamples` are stored so a reviewer can see when a verdict rests
on one frame; 52 folders were decided on fewer than three and are provisional.

**105 entries have no orientation, and that is not a claim of landscape.**
Drive only generates thumbnails for formats it can decode, and it returns 404
for camera negatives and broadcast masters — `.ARW`, `.MXF`, `.TIF`, `.XML`
sidecars. 54 of those entries are `reject` disposition and never publish
anyway; **31 publishable entries genuinely cannot be sampled this way** because
their folders contain nothing Drive will render.

Three things that cost real time here, worth knowing before you touch it:

- **Taking exactly five files per folder is wrong.** RAW folders hand you five
  `.ARW` negatives and you learn nothing — that left 114 folders unsampled.
  The sampler now walks up to 18 candidates until it has five usable frames.
- **Rank candidates before capping, not after.** Collecting 40 files
  breadth-first and then sorting by format cannot help a folder holding 300
  negatives before its first JPEG. It now pools 800, ranks, then takes 40.
- **TIFF is not thumbnailable.** Drive 404s every `.tif`. Classifying it as
  usable let TIFFs crowd JPEGs out of mixed folders.

## What is still owed

- **`resolutionClass` is null on every entry.** Pic-Time serves web resolution
  only and event teams need 300 DPI CMYK (§7.7) — flag it rather than
  pretending otherwise.
- **The 31 unsampled publishable entries need orientation by eye**, or a
  different route than the thumbnail endpoint.
- **`linkStatus` is `unchecked` everywhere.** The nightly monitor (§5.2) has
  not run. `unchecked` does not mean healthy.
- **~30–50 coarse entries need splitting by someone who was there** (§7.5).
  `Interviews` (6,563 files) and `Sit Down Interview Productions` (5,382) are
  certainly many separate interviews collapsed together.
- **Dropbox, Pic-Time and Vimeo entries are not in this catalog** — it covers
  the Google Drive crawl only. Those ~66 get hand-entered (§3.1).
- **The client's B-Roll PDF carries Vimeo passwords in plaintext** — page 5, two
  of them. They belong in `accessNote`, which is internal-only and never
  rendered publicly. The values are deliberately not reproduced here: a note
  warning that a credential must not spread is a poor place to spread it.
