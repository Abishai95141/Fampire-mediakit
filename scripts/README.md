# scripts/

Fifty-odd files, four jobs. This page says which is which, because the folder
does not — and running one from the wrong group against a live database is the
kind of mistake that is obvious only afterwards.

Two of them are the front doors and are run through npm, not directly:
`setup.mjs` (`npm run setup`) and `verify.mjs` (`npm run verify`). Everything
below is what those two call, plus the tools they do not.

Every TypeScript script here runs through Payload's own loader:

```bash
npx payload run scripts/<name>.ts
```

`.mjs` files are plain Node with no dependencies, and run with `node`.

---

## 1. Setup — `npm run setup` runs these, in this order

Order matters and is not visible from the filenames. `seed-surfaces.ts` writes
the five PUBLIC pages and `seed-pages.ts` writes the six NARRATIVE ones —
similar names, different halves of the site, and `deploy-landing.ts` needs the
first of those to exist. All are idempotent, so the whole sequence is safe to
repeat.

| | |
|---|---|
| `create-admin.ts` | first `/admin` login. `ADMIN_EMAIL` + `ADMIN_PASSWORD` in the environment. Also the password-reset path |
| `seed-brands.ts` | the worlds the catalog is filed under |
| `import-entries.ts` | the catalog itself, from `data/fampire/entries.json`. Imports as **draft**; `PUBLISH_CLEAN=1` publishes the subset that needs no human judgement |
| `seed-surfaces.ts` | the five public pages — `/`, `/library`, `/films`, `/people`, `/press` — as CMS records |
| `seed-content.ts` | film slate, family bios, navigation, footer |
| `import-editorial.ts` | film synopses and the press log |
| `seed-appearance-order.ts` | the order key the press log sorts on |
| `seed-watch.ts` | the where-to-watch matrix |
| `seed-pages.ts` | the six narrative pages (`/institution`, `/book`, …), created as drafts |
| `deploy-landing.ts` | the approved landing composition, from `data/fampire/landing-layout.json`. Merges — it never overwrites copy edited since |
| `seed-magazine-tree.ts` | magazines → cover star → issue → collections |
| `seed-person-aliases.ts` | the other spellings people really type |

## 2. Checks — `npm run verify` runs these

Safe on any database; they read, and the two that write clean up after
themselves. The first four run by default, and all four pass on a fresh clone —
anything that cannot is opt-in, or the runner just teaches people to ignore
red.

| | |
|---|---|
| `verify-catalog.ts` | the invariants the brief calls non-negotiable: no unflagged child image published, no draft leaking to a signed-out reader, no small-z TereZa |
| `verify-cms.ts` | the editing surface, exercised the way an editor uses it |
| `verify-search.ts` | the search fixes, against the real catalog rather than fixtures |
| `verify-magazine-tree.ts` | the tree and the four picture pickers, read back independently of the seed that wrote them |
| `verify-runtime.mjs` | loads every public page in a real browser and fails on any client-side error. Needs the site running — `npm run verify -- --runtime` |
| `verify-coverage.mjs` | walks the folder tree and counts distinct files, so the coverage figure is measured rather than asserted. **Needs the raw crawl** in `data/audit/` and `~/Fampire`, so it is opt-in — `npm run verify -- --coverage` |
| `check-links.ts` | link-health sweep. **A product feature, not tooling**: this catalog stores pointers, so link rot is the architecture's main risk |
| `probe-tag-search.ts` | writes a nonsense tag, searches for it, removes it. Proves the tag path end to end on a live site |
| `list-aliases.ts` | prints who carries which alternate spellings |

## 3. Rebuilding `data/` — only when the source corpus changes

These regenerate the committed JSON in `data/fampire/`. Their output is already
committed, so a clone never has to run any of them — but they split into two
groups, and the difference matters if you do.

**These work on a clone.** Their inputs are `data/fampire/sources/`, which is
committed, and the live web.

```
fampire/build-catalog.mjs      fampire/build-previews.mjs
fampire/build-appearances.mjs  fampire/check-links.mjs
```

**These do not.** They read `data/audit/` — the raw crawl, which is gitignored
and lives only on the machine that produced it. Without it they stop rather
than write a half-built file.

```
enrich/build-entries.mjs       enrich/rollup.mjs       enrich/derive.mjs
enrich/vocab.mjs               enrich/extract-sources.mjs
enrich/backfill-previews.mjs   enrich/sample-orientation.mjs
crawl/crawl_master.py          crawl/crawl-missing.mjs
crawl/compare_master.py        crawl/propose_new_collections.py
```

## 4. Operations and one-shots

**`confirm-minors.ts` and `publish-all.ts` change what is visible to the
public.** Read them before running either.

| | |
|---|---|
| `confirm-minors.ts` | records a named human's sign-off on collections featuring the children. It does not weaken the gate — it is how the gate is satisfied |
| `publish-all.ts` | publishes remaining drafts |
| `deploy-recaps.sh` | rsyncs the recap videos to a server; they are deliberately not in git |
| `cms-walkthrough.mjs` | drives a browser through `/admin` and records it |
| `record-landing.mjs` | records a scroll-through of the landing page |
| `create-demo-admin.ts` | a throwaway login for that recording. **Local databases only** |

### Already applied

Each of these fixed one thing, once, and has been applied to every database
that exists. They are kept because each documents a decision — why the events
were consolidated, why those titles were rewritten — and deleting them would
leave the data looking arbitrary.

They read the DATABASE, not the crawl, so they *will* run on a fresh clone.
That is the trap: **re-running one is not a repair, it replays a change on top
of whatever has happened since.** `consolidate-events.ts` deletes rows (backing
them up to `data/audit/` first); `retitle-machine-names.ts` rewrites titles a
person may since have edited by hand. Use `DRY_RUN=1` and read the plan.

```
add-lately.ts             apply-previews.ts          apply-slate-and-log.ts
apply-zeen-layouts.ts     compose-zeen-landing.ts    consolidate-events.ts
dedupe-people.ts          derive-attribution.ts      derive-events.ts
fix-family-portraits.ts   fix-stale-copy.ts          import-master-crawl.ts
import-missing-film-collections.ts
materialise-landing.ts    retitle-machine-names.ts   tidy-imported-titles.ts
```

---

Eighteen of these accept `DRY_RUN=1`, which prints what would change and
writes nothing — including fourteen of the sixteen already-applied ones. Where it
is offered the script's own header says so, and on anything in group 4 it is
worth spending the extra run. The two there that do not offer it —
`apply-previews.ts` and `import-missing-film-collections.ts` — are the ones to
read in full before executing.
