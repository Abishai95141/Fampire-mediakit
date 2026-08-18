import type { MetadataRoute } from "next";

import { loadEntries } from "@/lib/fampire/catalog";

/**
 * A sitemap, which the site did not have — `/sitemap.xml` returned 404.
 *
 * Every published collection has a shareable URL now, so a search engine that
 * cannot enumerate them only ever finds the handful linked from the surfaces.
 * Generated from the catalog, so it can never drift from what is published.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3200";
  const entries = await loadEntries();

  /**
   * The five surfaces, and only those.
   *
   * This listed ten paths, five of which are the narrative pages that were
   * archived and deleted — so the sitemap was actively telling search engines
   * to crawl URLs that now return 404. A sitemap is a set of promises about
   * what exists; stale entries in it are worse than a shorter file.
   */
  const fixed = ["", "/library", "/films", "/people", "/press"];

  return [
    ...fixed.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...entries.map((e) => ({
      url: `${base}/collections/${e.slug ?? e.id}`,
      lastModified: e.last_checked ? new Date(e.last_checked) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
