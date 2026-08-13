import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";

/**
 * Brand resolution for the `[brand]` route segment.
 *
 * The URL used to be a folder on disk — `app/(frontend)/fampire/` — while the
 * brands themselves were rows in Postgres. That meant giving Zanzi a page
 * required creating a directory and deploying, which broke the one promise the
 * whole multi-tenant design exists to keep:
 *
 *   "Adding brand #9 must be: create a record, paste links, publish. No
 *    deploy." — §2.2
 *
 * With one dynamic segment resolved from the database, a new world works the
 * moment someone saves the record.
 */

export type Brand = {
  id: number | string;
  slug: string;
  name: string;
  tagline?: string | null;
  hasAssets?: boolean | null;
};

/** Cached per request, so the layout and the page share one query. */
export const getBrand = cache(async (slug: string): Promise<Brand | null> => {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "brands",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    return (result.docs[0] as Brand) ?? null;
  } catch {
    return null;
  }
});

export const listBrands = cache(async (): Promise<Brand[]> => {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "brands",
      limit: 50,
      depth: 0,
      sort: "name",
    });
    return result.docs as Brand[];
  } catch {
    return [];
  }
});

/**
 * Reserved first segments.
 *
 * `[brand]` is greedy — it would happily match `admin` and try to render a
 * brand called "admin". These belong to the platform, not to a world.
 */
export const RESERVED = new Set([
  "admin", "api", "payload-api", "_next", "media", "favicon.ico", "robots.txt", "sitemap.xml",
]);

