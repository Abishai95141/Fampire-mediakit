# Audit remediation — what was fixed, and how to check

Companion to `CORPUS-AUDIT.md`. Every row is verifiable with the command given.

## The three criticals

| # | Defect as found | Now | Verify |
|---|---|---|---|
| 1 | "92% of the archive" was `files_all_copies` — folders sharing a NAME that entries did not link. Real reach: **60.5%** | **92.9% measured** (127,019 / 136,798). Fixed by making the claim TRUE — the rollup records every merged folder, entries link them, the detail page renders them — not by lowering the number | `node scripts/verify-coverage.mjs` |
| 2 | 15 seed folder ids from the client's own index never crawled; 13 alive | **Crawled.** 31 folders, 1,187 files recovered, incl. `Anthony Lolli Headshot and Bio`, `TereZa Hakobyan-Lolli Headshot and Bio`, `Love & Legend Headshots and Bios`, `Lolli Brands Logos`, `Bryan Johnson RAW BTS Videos` | `node scripts/crawl/crawl-missing.mjs` → `uncrawled: 0` |
| 3 | Merged-folder membership unrecoverable; `entries_alternates` 0 rows | **3,093 rows.** The inputs survived, so membership was uncomputed rather than lost — `scripts/enrich/rollup.mjs` recomputes it | `psql -tAc "select count(*) from entries_alternates"` |

## Tier B — specified in the brief, never built

§4.3 defines Tier B as hero assets (logos, posters, trailers, headshots) with full metadata. Only Tier A was ever built, so a 4-file logo suite and a 5-file headshot folder fell below the ≥10 threshold and vanished.

**32 hero-asset folders promoted.** Posters 3→10, trailers 1→6, logos 22→29, magazine 31→39.

## Discoverability

| Defect | Before | After |
|---|---|---|
| `?q=drive`, `?q=google` | 476 of 476 — the platform label was in every haystack | **0** |
| `?q=oll` | 392 (matched inside "Lolli", "roll") | **0** — word-boundary, not substring |
| `?q=master` | 0, while 304 entries have it in their path | **312** — folder vocabulary indexed |
| `?q=deliverables` | 0, while 95 do | **103** |
| `?q=terza` (typo) | 0 | **"Did you mean tereza?"** |
| Facet axes | 8 | **11** — adds Featuring (guest people), Place, Magazine issue |
| Sorting | none; hardcoded `-fileCount` | **5 options**, relevance-ranked when a query is present |
| Pagination | none; 476 cards, 1,365,864 bytes | **60/page, 347,468 bytes** |
| `occasion` | NULL on 378 — they vanished from the facet | **explicit "Unspecified" bucket**, selectable |

`bio` → 156 and `pro` → 158 are *prefix* matches ("Biohack", "Productions"), kept deliberately so half a name finds the rest — `ashto` → 4.

## Truth on the surfaces

| Defect | Fix |
|---|---|
| "8 documentary films" while 3 had zero material | Counts films **with** material → **5** |
| "streaming on eleven platforms" hardcoded; `films_watch` 0 rows | 25 watch links migrated, **10 platforms counted** |
| `/clip-them` Vertical and Horizontal rendered identically | Block schema had no `orientation` field **and** the renderer never read one. Both fixed |
| Love/Legend "0 collections" read as "nothing exists" | Now "**0 collections · 4 more awaiting review**" — the child-safety gate, stated |
| `sitemap.xml` / `robots.txt` 404 | Both 200; sitemap generated from the live catalog |
| Hero video dead frame for 11s | Server-side embed probe; still renders instantly. The 401 is a Vimeo account setting only the client can change |

## Standing checks

```bash
node scripts/verify-coverage.mjs     # coverage, and fails if alternates stop being linked
npm run catalog:verify               # 16 invariants incl. child-safety and link health
npm run links:check                  # 601 links, ~42s
node scripts/crawl/crawl-missing.mjs # re-runnable; reports uncrawled seeds
```

## Attribution — three claims, kept apart

"Featuring" is a statement about who is **in the frame**. The archive frequently
only records who **shot** it or who **owns** it, and collapsing those into one
line produced 110 collections crediting the BTS cinematographer as a subject.

Roles are now derived from what the folder name actually says:

| Pattern in the source folder | Role |
|---|---|
| `sHEALed BTS Adam Chani Master` | crew — shot it |
| `sHEALed Main Deliverables Chris Jackson` | crew — cut and delivered it |
| `TereZa Cell footage` / `Cell Phone` | crew — whose phone shot it |
| `shot/filmed/edited/produced/directed by X` | crew |
| `owned by X`, `courtesy of X` | rights holder |
| anything else | featured — in frame |

| | before | after |
|---|---|---|
| Adam Chani | 110 "Featuring" | **0 featured · 110 crew** |
| Chris Jackson | 17 "Featuring" | **0 featured · 17 crew** |
| TereZa | 105 in-frame | **20 in-frame · 83 rights holder · 2 crew** |

Corpus totals: **324 featured · 131 crew · 83 rights holder** relations. The
detail page renders them as three separate lines — *Featuring*, *Shot or cut
by*, *Courtesy of*.

Child safety was computed **before** reclassification on purpose: an attribution
change must never be able to weaken the §9.1 gate as a side effect. `contains_minor`
is unchanged at 17.

## Not fixed — and why

- **No content extraction.** No OCR, PDF text, transcripts or checksums. Reading 135k files conflicts with the never-host constraint; the right route is Drive API `md5Checksum` + `mimeType`, which is a separate piece of work.
- **Person identity duplicates** (~26 of 152) — needs a merge pass.
- **Non-Drive platforms** (46 Dropbox, 27 Pic-Time, 5 Vimeo) still uningested. Either ingest them or state the Drive-only scope in the deliverable; silence is the only wrong answer.
