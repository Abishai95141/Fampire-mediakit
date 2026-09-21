import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Brands } from "./collections/Brands";
import { Entries } from "./collections/Entries";
import { LandingAssets } from "./collections/LandingAssets";
import { Media } from "./collections/Media";
import { Appearances, Articles, MagazineIssues } from "./collections/Stories";
import { Pages, SiteSettings } from "./collections/Pages";
import { Events, Films, Locations, People } from "./collections/Taxonomy";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Managed Postgres requires TLS; a local one does not have it. Opt in with
 * DATABASE_SSL=true rather than sniffing the hostname, so the behaviour is
 * declared by the deployment rather than guessed from a string.
 */
function withSsl(uri: string): string {
  if (process.env.DATABASE_SSL !== "true" || !uri || uri.includes("sslmode=")) return uri;
  return uri + (uri.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

/** Set in production to move uploads off the container's ephemeral disk. */
const S3_BUCKET = process.env.S3_BUCKET;

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
    /**
     * The wordmark on the login screen and in the nav.
     *
     * Both paths must also appear in app/(payload)/admin/importMap.js, which
     * is generated at build time — run `npm run payload:importmap` after
     * touching this. A component missing from that map does not fail loudly:
     * the whole admin renders as a blank page and the only clue is
     * "PayloadComponent not found in importMap" in the server log.
     */
    components: {
      graphics: {
        Logo: "/components/admin/Logo.tsx#Logo",
        Icon: "/components/admin/Icon.tsx#Icon",
      },
      views: {
        /**
         * "Is anything waiting on me", instead of a grid of table names.
         *
         * Payload's dashboard lists every collection as a card — a directory,
         * which answers "where is X" for somebody who already knows what they
         * came to do. The child-safety queue in particular had no surface
         * anywhere: the one rule this system enforces absolutely was visible
         * only by knowing to filter the Collections list on two fields.
         *
         * Every number is counted at request time. Nothing is cached, because
         * a dashboard that can be stale is worse than none — it is believed.
         */
        dashboard: { Component: "/components/admin/Dashboard.tsx#Dashboard" },
      },
    },
  },

  routes: {
    api: "/payload-api",
  },

  /**
   * No multi-tenancy. This is deliberate, and it is a REMOVAL.
   *
   * `multiTenantPlugin` used to scope entries, pages, articles, magazine
   * issues, appearances and site settings by brand. It added a "Filter by
   * Tenant" selector to the admin sidebar that silently scoped EVERYTHING
   * behind it — and because the selection persists, an editor who once picked
   * a brand kept that filter forever without any indication on the screens it
   * was hiding things from.
   *
   * The damage was not theoretical. With it set to Biohack Yourself:
   *   - Pages listed 3 records instead of 11, hiding all five real surfaces,
   *     because those belong to Lolli Brands Entertainment.
   *   - Searching a collection by its exact title returned "No Results" for
   *     any of the 411 collections in the other brand.
   * Both read as "the CMS is broken" rather than "a filter is set", which is
   * exactly what a hidden global filter always looks like from the inside.
   *
   * It was never earning that cost. There is one client, one media team and
   * ONE library; brands are a lens on that library, not a boundary around it
   * — the same conclusion the routing reached when brands stopped being a URL
   * segment. So `tenant` is now an ordinary optional relationship declared on
   * each collection (see `brandField` in collections/brand.ts), keeping the
   * exact same `tenant_id` column and every existing value, with no migration
   * and no data change. What is gone is the invisible filter.
   *
   * If per-brand editing permissions are ever genuinely needed, the honest
   * shape is access control on the role — not a UI filter that hides records
   * from the person looking straight at them.
   *
   * ── This list IS the navigation ────────────────────────────────────────
   *
   * Payload builds the sidebar groups in the order the collections are
   * declared, so the order here is what an editor reads top to bottom. It is
   * ordered by how often each is reached for rather than by how the schema
   * grew: the library first because it is the product, settings last because
   * they are set once.
   *
   * `docs/architecture-review.md` recorded the problem the old order and the
   * old names created — "an editor sees a CMS whose vocabulary is ours" — and
   * "Who & What" was the clearest case of it.
   */
  collections: [
    Entries, Media,                        // Library
    Pages,                                 // Pages
    MagazineIssues,                        // Magazines
    Appearances, Articles,                 // Press
    People, Films, Events, Locations,      // People & Films
    Brands, LandingAssets, SiteSettings, Users, // Settings
  ],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: {
      /**
       * TLS is appended when the target requires it.
       *
       * AWS-managed Postgres (Lightsail and RDS both) rejects unencrypted
       * connections outright — `no pg_hba.conf entry for host …, no
       * encryption` — while Payload's adapter opens a plain socket by default.
       * The first deploy therefore reached the database, authenticated, and
       * was refused at the TLS layer, surfacing only as an unhandled rejection
       * with the reason "undefined".
       *
       * `no-verify` encrypts the connection without validating the server
       * certificate. The traffic never leaves AWS's private network here, but
       * to verify properly, hand the RDS CA bundle to the pool instead and
       * drop this. Local Postgres has no TLS and is left alone.
       */
      connectionString: withSsl(process.env.DATABASE_URI ?? ""),
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

  /**
   * Uploads go to S3 in production, and to disk everywhere else.
   *
   * The Media collection writes to `public/media`, which is correct on a
   * laptop and silently destructive on a container: App Runner, ECS and every
   * other managed runtime give each task an EPHEMERAL filesystem, so a brand
   * mark uploaded on Tuesday is gone at Thursday's deploy, leaving a database
   * row pointing at a 404. Nothing has been uploaded yet — `media` has zero
   * rows — so this is being fixed before it can cost anyone a file rather than
   * after.
   *
   * Enabled only when a bucket is actually configured. That keeps local
   * development on disk with no AWS account, no credentials and no network,
   * and means a missing variable degrades to the old behaviour instead of
   * crashing the boot.
   */
  /**
   * ALWAYS registered, and only its behaviour is conditional.
   *
   * This was `S3_BUCKET ? [s3Storage(...)] : []`, which looks equivalent and
   * is not: Payload bakes an importMap of admin components at BUILD time from
   * the plugin list. Building without S3_BUCKET produced a map with no S3
   * entry; running with S3_BUCKET then activated the plugin, which asked for
   * `@payloadcms/storage-s3/client#S3ClientUploadHandler`, could not find it,
   * and rendered the entire admin panel as a blank page — server logs saying
   * "PayloadComponent not found in importMap", browser console saying nothing
   * at all. The public site was completely unaffected, which made it look like
   * an admin bug rather than a config one.
   *
   * The rule this encodes: the plugin LIST must be identical at build and at
   * runtime. Anything environment-dependent belongs inside a plugin's options,
   * where `enabled` is designed for exactly this.
   */
  plugins: [
    s3Storage({
      enabled: Boolean(S3_BUCKET),
      /**
       * `landing-assets` is here because it was NOT, and that was a live
       * 500 on the landing page.
       *
       * The collection writes to `staticDir: "public/landing"`. Next's
       * `output: "standalone"` does not copy `public/` into the bundle, so on
       * the server the directory does not exist, and Payload's file route
       * threw rather than 404ing — the family photograph behind "You are not
       * invisible" was a broken image on the live site while every page
       * returned 200. Exactly the trap `/recaps/` hit, in a route nginx
       * cannot alias because Payload serves it.
       *
       * The `landing` prefix is not decoration: it matches the keys the
       * mirror already wrote to this bucket, and it keeps these files out of
       * `media`'s root namespace, where two uploads called `cover.jpg` would
       * otherwise be one object.
       */
      collections: {
        media: true,
        "landing-assets": { prefix: "landing" },
      },
      bucket: S3_BUCKET ?? "unset",
      config: {
        region: process.env.AWS_REGION ?? "ap-south-1",
        /**
         * No credentials block. On EC2, Lightsail, ECS and App Runner the SDK
         * picks up the instance or task role automatically — passing keys here
         * would mean long-lived secrets in the environment when the platform
         * already offers rotating ones.
         */
      },
    }),
  ],
});
