# Audit context — internal briefing

> **Not setup documentation, and not current.** This was written to brief an
> audit of the August corpus. It points at absolute paths on the machine that
> ran it (`/Users/abishaikc/…`) and at a `~/Fampire` directory that is **not
> part of this repository**, so none of its commands will work on a clone.
> Its counts have also moved on — 600 entries now, not 559.
>
> To get the project running, read `README.md`. For the corpus numbers that
> are current, read `docs/CORPUS-AUDIT.md` and `docs/AUDIT-FIXES.md`.
>
> It is kept because the pipeline diagram below is the clearest record of how
> the catalog was actually derived, and that lineage has not changed.

Shared briefing for the end-to-end audit. Every reader should VERIFY rather
than trust it.

## Where things are

| | |
|---|---|
| App | `/Users/abishaikc/fampire-media-center` (this repo) |
| Original audit + crawlers | `/Users/abishaikc/Fampire` (`data/`, `scripts/`, `BUILD-PLAN.md`) |
| Database | Postgres `fampire_media_center` — `psql -tAc "..." fampire_media_center` |
| Running site | `http://127.0.0.1:3200` (may be running; start with `npm run start`) |
| Admin | `http://127.0.0.1:3200/admin` |
| Brief | `/Users/abishaikc/Fampire/BUILD-PLAN.md` — the spec everything is measured against |

## The pipeline as currently built

```
Google Drive (public folders)
  → scripts/*.py in ~/Fampire            crawl via embeddedfolderview HTML
  → ~/Fampire/data/drive-crawl-full.json 20,269 folders · 135,611 files
  → ~/Fampire/data/catalog.json          2,622 subjects after rollup, 559 Tier A
  → scripts/enrich/extract-sources.mjs   slices into data/audit/
  → scripts/enrich/sample-orientation.mjs  thumbnail sampling → orientation.json
  → scripts/enrich/build-entries.mjs     → data/fampire/entries.json + review CSVs
  → scripts/import-entries.ts            → Payload/Postgres
  → lib/fampire/payload-catalog.ts       DB → the front end's `Entry` shape
  → app/(frontend)/(site)/**             the UI
```

Key files: `scripts/enrich/vocab.mjs` (controlled vocabulary), `derive.mjs`
(all derivations), `collections/Entries.ts` (the schema),
`lib/fampire/catalog.ts` (search + facets), `components/fampire/EntryCard.tsx`.

## Numbers believed true (VERIFY THESE — do not trust)

- 135,611 files crawled · 20,269 folders · 2,622 subjects · 559 Tier A
- 559 entries in Postgres · 476 published · 83 draft
- 73 held: 60 `reject` (machine artifacts), 13 `merge` (wrong granularity)
- 10 held by the `contains_minor` gate
- 453 entries have a verified `previewFileId`; 454 have `orientation`
- 150 people · 8 films · 11 events · 9 places · 7 brands
- Link health 100% (559/559 `ok`)

## Already-confirmed defects (root causes found, NOT yet fixed)

1. **Hero video 401.** `https://player.vimeo.com/video/1025829605` returns
   **401**; the oEmbed endpoint returns 200 with real metadata. So the video
   exists and is public, but its EMBED is domain-restricted in Vimeo's privacy
   settings and `localhost` is not allowlisted. Not autoplay, not codec, not a
   component error. Verify independently.
2. **"0 collections" on Films/People.** Real data, not a display bug:
   `Skin Deep`, `From Fat Lolli to 6 Pack Lolli` and `The New Woo` have ZERO
   entries linked; sHEALed has 220. Love and Legend Lolli have ~0.
   Investigate WHY the derivation missed them.
3. **Person coverage.** "anthony" appears in 8 of 559 folder paths, "tereza" in
   100. 188 entries name nobody.

## What the audit must establish

Not "does the UI look right" — whether the **corpus is comprehensively
ingested, correctly abstracted, traceable to source, and discoverable.**

Report measured numbers with the command that produced them. Where something
cannot be determined, say so explicitly rather than estimating. Distinguish
clearly between:
- what is DETERMINISTIC (derived by rule from data)
- what is HARDCODED (a constant in code)
- what is HUMAN-AUTHORED
- what is UNKNOWN / unverifiable

Nothing in this build uses an LLM at runtime or in the pipeline. If you find
something that looks AI-generated, that is a finding.
