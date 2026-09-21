# The FAMPIRE® Media Center

The press room and living archive of The Lolli Family Institution.

**It is a catalog over the client's existing storage — never a digital asset
manager.** ~135,000 files stay exactly where they are, in the client's own
Google Drive, Dropbox, Pic-Time and Vimeo. This application stores a link and a
description and makes them findable. It hosts nothing, copies nothing and
migrates nothing.

---

## Running it

You need **Node 20 or newer** (22 is what this is developed against — `.nvmrc`)
and **Postgres**. If you have Docker, you do not need to install Postgres.

```bash
git clone https://github.com/Abishai95141/Fampire-mediakit.git
cd Fampire-mediakit

npm install
docker compose up -d        # Postgres on :5433 — skip if you run your own
npm run setup               # env, schema, admin account, catalog, pages
npm run dev
```

Then <http://localhost:3200>, and the CMS at
<http://localhost:3200/admin> with the account `npm run setup` asked you to
create.

That is the whole procedure. `npm run setup` writes `.env` for you, generates
the session secret, waits for Postgres, creates the database, applies all
migrations and loads roughly 600 catalog entries and every page. It is
idempotent — if something goes wrong partway, fix the cause and run it again
rather than working out which half completed.

**Already run Postgres?** Skip `docker compose up -d`, and put your own server
in `.env` before `npm run setup`:

```
DATABASE_URI=postgres://localhost:5432/fampire_media_center
```

The database is created for you if it does not exist.

### Checking it

```bash
npm run verify              # catalog invariants, CMS, search, the magazine tree
npm run verify -- --runtime # …and every public page in a real browser (needs npm run dev)
npm run typecheck
npm run lint
```

Everything in the default set passes on a clone with nothing but a database —
that is the rule the set is chosen by. `--runtime` is separate because it needs
the site actually serving, and `--coverage` because it measures the raw crawl,
which is deliberately not in this repository.

### If something is wrong

| | |
|---|---|
| `Could not reach Postgres` | `docker compose up -d`, or start your own server and correct `DATABASE_URI` |
| Admin panel is blank, log says *PayloadComponent not found in importMap* | `npm run payload:importmap`, then rebuild. A custom admin component was added without regenerating the map |
| Migrations refuse to run | The schema drifted from the migration history. Do not use dev push — write a migration: `npm run db:migrate:create` |
| Forgotten the admin password | `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run db:admin` |
| Port 3200 taken | `next dev -p <port>` and match `SITE_URL` |

`npm run build` needs no database and no `.env` — it never connects. Everything
is server-rendered on demand, so the database is a **runtime** dependency only.

### What you end up with

Measured on a genuinely empty database, from `npm run setup` alone:

| | |
|---|---|
| Catalog entries | **600** — 515 published, the rest awaiting sign-off |
| People · Brands · Films | 125 · 7 · 8 |
| Press appearances | 57 |
| Magazine issues | 6, with their cover stars |
| Pages | 11 — the five public surfaces plus six narrative drafts |

Everything the site does works on that: search, facets, the collection pages,
the picture pickers, the magazine tree, the CMS.

**It is not a copy of the client's production database, and is not meant to
be.** What is committed here is the catalog as imported. Their live instance has
had editorial work done *in the CMS* since — more magazine issues, more
alternate spellings, hand-corrected titles — and that lives in their database,
not in this repository. To work against real production data you need a dump
from them, not this repo.

---

## Non-negotiables

These constrain every change. They come from the client's brief, not from
preference.

1. **Never host or migrate their files.** Every card links out to the original
   folder. Links plus metadata, nothing else.
2. **No gates on public surfaces.** No login, no form, no email capture in
   front of any asset. A press room with a login in front of it is not a press
   room.
3. **A collection featuring a child does not publish until a named human
   confirms it.** Love and Legend Lolli are children and appear throughout the
   library. This is enforced, not promised — `scripts/verify-catalog.ts` fails
   if it ever stops being true, and `npm run verify` runs it.
4. **TereZa is always spelled with a capital Z** — everywhere, including alt
   text and metadata. Also checked.
5. **Competitors are never named**, including in copy written for search.

---

## What is in here

```
app/
  (frontend)/           the public site — landing, library, collections, login
  (payload)/            the CMS, and the REST/GraphQL API at /payload-api
collections/            the Payload schema: Entries, People, Brands, Pages, …
components/
  fampire/              the site, including one component per page block
  admin/                custom CMS controls, notably the picture pickers
  reactbits/            one vendored third-party component — see NOTICE.md
lib/fampire/
  catalog.ts            search, facets, aliases — the matcher lives here
  payload-catalog.ts    the seam between Payload rows and the site's Entry type
data/fampire/           the catalog and page compositions, as committed source
migrations/             the only thing that changes the database schema
scripts/                setup, verification, and the data pipeline — see scripts/README.md
docs/                   deployment, editing guide, enrichment, the corpus audit
```

### The five pages

`/` · `/library` · `/films` · `/people` · `/press`, plus `/collections/<slug>`
for a single collection. Every one of them is **composed of blocks in the CMS**
— none is a hardcoded template, and the media team reorders or replaces any
block without a deploy. `docs/editing-guide.md` is written for them.

### Three things that will confuse you

- **The API is at `/payload-api`, not `/api`.** The site already owns
  `/api/auth`, and `components/fampire/LoginForm.tsx` hard-codes that path as a
  string literal — a coupling neither `tsc` nor `next build` can see.
- **Schema changes only ever happen through a migration.** Payload's dev push
  is off (`push: false`). With it on, any `payload run` silently reshapes the
  database and the migration history quietly becomes fiction.
- **Adding a custom admin component means regenerating the import map.** Miss
  it and the whole admin panel renders blank, with the only clue in the server
  log. `npm run payload:importmap`.

More of these, with the incidents behind them, in `docs/payload-harness.md`.

---

## Deploying

Deployment is the client's, on their own accounts — this repository supplies
guides, not hosting.

- `docs/deploy-ec2.md` — the current production stack
- `docs/deploy-aws.md` — the container route
- `Dockerfile` — builds standalone; applies its own migrations on boot

Two variables matter in production and nowhere else: `DATABASE_SSL=true`,
because managed Postgres refuses unencrypted connections, and `S3_BUCKET`,
because a container's filesystem is ephemeral and an upload written to disk is
gone at the next deploy. `.env.example` explains both.

---

## Licence

Proprietary — see `LICENSE`. Third-party components and their terms are listed
in `NOTICE.md`; there is no GPL, AGPL or SSPL anywhere in the dependency tree.
