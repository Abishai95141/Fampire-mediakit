import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
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
   */
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
  plugins: S3_BUCKET
    ? [
        s3Storage({
          collections: { media: true },
          bucket: S3_BUCKET,
          config: {
            region: process.env.AWS_REGION ?? "ap-south-1",
            /**
             * No credentials block. On App Runner, ECS and EC2 the SDK picks
             * up the task's IAM role automatically — passing keys here would
             * mean putting long-lived secrets in the environment when the
             * platform already offers rotating ones.
             */
          },
        }),
      ]
    : [],
});
