import type { MetadataRoute } from "next";

/**
 * `/robots.txt` returned 404. The press room is meant to be found — §2.4 makes
 * every public surface ungated — so the only thing worth excluding is the CMS.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3200";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/payload-api", "/api", "/login"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
