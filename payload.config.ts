import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Brands } from "./collections/Brands";
import { Entries } from "./collections/Entries";
import { Media } from "./collections/Media";
import { Appearances, Articles, MagazineIssues } from "./collections/Stories";
import { Pages, SiteSettings } from "./collections/Pages";
import { Events, Films, Locations, People } from "./collections/Taxonomy";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * FAMPIRE Media Center — Payload configuration.
 *
 * One install for the whole institution, multi-tenant from commit one
 * (build plan §2.2). The database holds a few hundred catalog entries and page
 * content — NOT the 135,611 assets, which stay in the client's own storage and
 * are only ever pointed at.
 *
 * Two deliberate deviations from a stock Payload install, both forced by the
 * app this is landing inside:
 *
 * 1. The REST/GraphQL API is mounted at `/payload-api`, not `/api`. The
 *    FAMPIRE front end already owns `/api/auth`, and components/fampire/
 *    LoginForm.tsx hard-codes that path as a bare string literal — a coupling
 *    no compiler catches (build plan §2.6). Leaving Payload on `/api` would put
 *    a catch-all route in the same segment as that handler. The admin UI reads
 *    this value from the config, so nothing needs to be told twice.
 *
 * 2. HNN keeps its own Drizzle schema and its own studio. Payload's tables and
 *    migrations live alongside it and are never merged (§2.3).
 */
export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "— FAMPIRE Media Center",
    },
  },

  routes: {
    api: "/payload-api",
  },

  collections: [
    Users, Brands,
    Entries, Media,
    Articles, MagazineIssues, Appearances,
    Pages, SiteSettings,
    People, Films, Events, Locations,
  ],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? "",
    },
    /**
     * Migrations are the source of truth for schema — never dev-mode push.
     *
     * With push on (the default), any `payload run` or `next dev` silently
     * reshapes the database to match the config. The migration state then
     * disagrees with reality, and the next `payload migrate` stops to warn
     * that proceeding will lose data. That already happened once here.
     *
     * Off, the schema only ever changes through a reviewed migration file —
     * which is also what the client needs, since they run the deployment on
     * their own accounts and cannot debug schema drift.
     */
    push: false,
  }),

  // Payload refuses to boot without this, and a changed value invalidates every
  // existing session — so it is required, not defaulted.
  secret: process.env.PAYLOAD_SECRET ?? "",

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },

  // Catalog entries are pointers, not uploads. sharp is here for the handful of
  // genuine uploads the media team will make (brand marks, page furniture),
  // not for processing the client's library.
  sharp,

  plugins: [
    multiTenantPlugin({
      tenantsSlug: Brands.slug,
      /**
       * Content is tenant-scoped; taxonomy is not.
       *
       * Entries and Pages belong to exactly one of the eight worlds, so a
       * contributor assigned to Biohack Yourself sees only its catalog.
       *
       * People, Films, Events and Locations are deliberately shared: TereZa
       * appears across brands, and duplicating her per-tenant would break
       * "one entry, many lenses" (§4.5 rule 2) and make a rename a
       * find-and-replace across worlds.
       */
      collections: {
        entries: {},
        pages: {},
        articles: {},
        "magazine-issues": {},
        appearances: {},
        "site-settings": { isGlobal: true },
        // Media is deliberately NOT tenant-scoped: a brand mark or a portrait
        // is used across worlds, and duplicating an upload per tenant is how a
        // media library becomes six copies of the same photograph.
      },
      // Admins see every world; contributors see the ones they are assigned.
      userHasAccessToAllTenants: (user) =>
        (user as { role?: string } | null)?.role === "admin",
    }),
  ],
});
