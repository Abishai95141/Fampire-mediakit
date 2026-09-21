# The Payload harness — four things that will confuse you

Setup notes for stage 2 of `BUILD-PLAN.md`. Everything here is a deviation from
a stock `create-payload-app` install, forced by the app Payload landed inside.
Nothing here is preference.

## 1. The whole project is now ESM

`package.json` gained `"type": "module"`.

Payload's CLI loads `payload.config.ts` through `tsx`, and
`@payloadcms/richtext-lexical` is an ESM graph with top-level await. Under the
default CommonJS resolution that fails hard:

```
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph with
top-level await. From /payload.config.ts requiring @payloadcms/richtext-lexical
```

Safe here because the project had **zero** `.js`/`.cjs` files — every config was
already `.mjs` or `.ts`. Before adding a `.js` file, remember it is now ESM.

## 2. The front end moved into `app/(frontend)/`

Payload's admin renders its own `<html>` and `<body>`, so it needs a root
layout. The app already had one at `app/layout.tsx`, which would have wrapped
the admin panel in the site's shell.

Both now live in sibling route groups:

```
app/(frontend)/   layout.tsx, page.tsx, globals.css, fampire/, api/auth/
app/(payload)/    layout.tsx, admin/, payload-api/
```

**Route groups do not appear in URLs.** Every public path is byte-identical to
before the move — verified by diffing the build's route table: same paths, same
static/dynamic classification.

## 3. Payload's API is at `/payload-api`, not `/api`

The default would put a catch-all `api/[...slug]` in the same segment as the
front end's own `app/(frontend)/api/auth/route.ts`.

That handler is the sign-in seam, and `components/fampire/LoginForm.tsx:26`
hard-codes the path as a bare string:

```ts
const res = await fetch("/api/auth", { ... })
```

`BUILD-PLAN.md` §2.6 flags this as "the one coupling no compiler catches". So
Payload moved instead. Set once in `payload.config.ts`:

```ts
routes: { api: "/payload-api" }
```

The admin UI reads that value from the config, so nothing needs telling twice.
When stage 2 wires real sign-in, `/api/auth` delegates to Payload rather than
being replaced — which keeps the hard-coded string true.

## Also worth knowing

- **No `REST_PUT`.** `@payloadcms/next@3.88.0` exports GET/POST/PATCH/DELETE/
  OPTIONS only. Payload updates via PATCH; nothing is missing.
- **Next 16 is supported.** `@payloadcms/next@3.88.0` declares
  `next: ">=16.2.6 <17.0.0"` and the app is on 16.2.10. No downgrade needed.
- **Generated files are lint-ignored** — `migrations/`, `payload-types.ts`,
  `app/(payload)/admin/importMap.js`. They are regenerated, not hand-edited.
- **HNN keeps its own Drizzle schema and studio.** Payload's tables sit
  alongside; the two are never merged (§2.3).

## Deviation 4 — generate migrations with `S3_BUCKET` set, or one will delete a column

`payload migrate:create` diffs the config against the **previous migration's
`.json` snapshot**, and the S3 storage plugin only declares
`landing_assets.prefix` when a bucket is configured. So generating a migration
on a laptop, where `S3_BUCKET` is unset, produces this in `up()`:

```sql
ALTER TABLE "landing_assets" DROP COLUMN "prefix";
```

Applied to a deployment, that drops the column the landing images are served
through — the outage `payload.config.ts` already documents once, arriving a
second time by a different route. Nothing warns you; the migration looks
ordinary and its name says nothing about S3.

So:

```bash
S3_BUCKET=migration-shape-only npx payload migrate:create <name>
```

The value is never connected to. It exists only to make the config the same
shape as the one production runs, which is the shape the migration has to be
diffed against.

**Two more things about `migrate:create`.** It writes a `.ts` **and** a
`.json` snapshot, and the snapshot is what the next generation compares with —
so deleting a bad migration means deleting BOTH files, or the next one is
diffed against changes you thought you had thrown away. And it never touches
the database, so a generated migration is not an applied one.


## Commands

```bash
npx payload migrate            # apply schema
npx payload generate:types     # after any collection change
npx payload generate:importmap # after adding a custom admin component
npx payload run scripts/seed-brands.ts   # idempotent; the eight worlds
```

Ports 3000 and 3001 were occupied on the build machine (HNN standalone, and an
unrelated Docker app). `next start -p <free port>` if 3000 is taken — and check
for stray processes first, per §7.3.
