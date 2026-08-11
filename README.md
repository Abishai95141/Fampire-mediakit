# The FAMPIRE® Media Center

The press room and living archive of The Lolli Family Institution.

**It is a catalog over the client's existing storage — never a digital asset manager.**
~135,000 files stay exactly where they are, in the client's own Google Drive, Dropbox,
Pic-Time and Vimeo. This app stores links plus metadata and makes them findable. It hosts
nothing, copies nothing, and migrates nothing.

```bash
npm install
npm run dev          # → http://localhost:3000/fampire
```

No database, no environment file, no services. It boots from a static catalog and remote
media. `SITE_URL` is the only variable read, and it has a working default.

---

## Non-negotiables

These constrain every change. They come from the client's brief, not from preference.

1. **No gates on public surfaces.** No login, no form, no email capture in front of any
   asset. A press room with a login in front of it is not a press room.
2. **Never host or migrate their files.** Every card links out to the original folder.
3. **`contains_minor` is a DRAFT flag and must never be treated as decided.** Love and
   Legend Lolli are children and appear throughout the library. A human confirms before
   anything featuring them publishes. Nothing in this code enforces that yet — see
   *Known gaps*.
4. **TereZa is always spelled with a capital Z** — everywhere, including alt text and
   metadata.

---

## Structure

```
app/
  layout.tsx            root html/body, fonts, globals.css, metadata
  page.tsx              redirects / → /fampire
  api/auth/route.ts     501 stub — the Payload sign-in seam
  fampire/              the product: home, library, films, people, press, login
components/fampire/     Shell, HeroVideo, Preloader, SearchBar, EntryCard, Preview, …
lib/fampire/
  catalog.ts            ★ THE DATA SEAM — read this first
  auth.ts               ★ THE SESSION SEAM — one boolean
  media.ts, safe-next.ts
data/fampire/           catalog + generated artifacts + captured sources
scripts/fampire/        the four crawlers (plain node, no dependencies)
docs/fampire-media-center.md   design-system notes
```

---

## ★ Where the Payload backend attaches

Three files know a backend exists. Nothing else does.

### 1. `lib/fampire/catalog.ts` — the data seam
Line 1 imports `catalog.json`; everything below is pure functions over the resulting array.
Replace the import with a Payload query returning the same `Entry[]` and **every page and
component keeps working untouched.**

The contract Payload must satisfy is the `Entry` type in that file — 21 fields including
`visibility`, `access`, `contains_minor` and `contains_minor_confirmed`.

Two constraints to design around before cutover:

- **`PUBLIC_ENTRIES` is computed at module scope**, so the public/private split is frozen
  into the prerendered pages at build time. Once the catalog is DB-backed, flipping an entry
  to private will not remove it from `/fampire` until the next deploy. Make it
  request-scoped or force those pages dynamic.
- **`INDEX` builds the whole search haystack at module load.** Fine at 94 entries, fine at
  559, not fine beyond a few thousand. That is the handover point to Postgres full-text
  search.

### 2. `lib/fampire/auth.ts` — the session seam
FAMPIRE's entire contract with auth is one boolean: does this reader see held-back
collections, or the locked-card placeholder? It currently returns `false`. Point it at
Payload's session and the whole product turns on.

### 3. `app/api/auth/route.ts` — the sign-in seam
Returns 501. `components/fampire/LoginForm.tsx` POSTs `{email, password}` here and expects
either a 2xx that sets a session cookie, or JSON `{error}` to display.

**Watch this one:** the endpoint is a bare string literal in `LoginForm.tsx`. It is the only
cross-module dependency in the app that neither `tsc`, `eslint` nor `next build` can see.

---

## Scripts

```bash
npm run fampire:previews      # resolve preview images
npm run fampire:appearances   # build the appearance log
npm run fampire:catalog       # rebuild catalog.json from sources/
npm run fampire:links         # link-health sweep
```

Plain node, zero dependencies. **`fampire:links` is a product feature, not tooling** —
link rot is the primary risk of a catalog architecture, and nothing currently schedules it.

---

## Known gaps

Deliberate and documented, not oversights.

| | |
|---|---|
| **Catalog is 94 entries** | Replace with the 559-entry catalog from the crawl. The file must exist at `data/fampire/catalog.json`; the schema is the contract |
| **No favicon** | HNN's brand marks were removed as real emitted routes. A FAMPIRE `icon.svg` + `apple-icon.png` is an unscheduled design task |
| **Login is a 501 stub** | Locked cards route readers to a form that renders and then fails. Either Payload auth lands first, or the locked-card CTAs become "access on request" before public launch |
| **`contains_minor` unenforced** | 15 entries flagged, 0 confirmed, 7 of them public. The gate is a manual promise; at 559 entries it will not hold. Build it into Payload |
| **`HERO.skeletonFileId`** | `lib/fampire/media.ts` pins a Drive id for a family portrait including both children, on the public front door. It is the one child-identifying asset in *source* rather than replaceable data — it survives every catalog regeneration. Needs sign-off state attached |
| **URL prefix** | Serves at `/fampire/*`. Flattening to the domain root is ~38 route-literal edits across 11 files |
| **`docs/fampire-media-center.md`** | Still written as "FAMPIRE appended to HNN". Nine passages describe a proxy allowlist and shared sign-in that no longer exist |

---

## Provenance

Extracted from a fork of the HNN brand portal, which supplied the original design. All HNN
code, config, dependencies, data, docs and git history were removed. Verified: zero
`@/lib/auth|db|cms|content|storage|portal` imports, zero secrets, clean typecheck, clean
lint, clean build.
