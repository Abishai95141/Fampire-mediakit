import type { Metadata } from "next";
import config from "@payload-config";
import { cache } from "react";
import { getPayload } from "payload";

/**
 * Loading a CMS page, in one place.
 *
 * Every public surface goes through here — the landing page, the Library,
 * Films, People and Press. There is no such thing as a page that is "built in"
 * any more, because the moment one surface is special the media team cannot
 * trust that "select a page, edit its blocks" describes the site they have.
 *
 * Request-scoped cache: `generateMetadata` and the page body both need the
 * record, and without this that is two identical queries per request.
 */
export const findPage = cache(async (path: string) => {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: normalisePath(path) } },
    limit: 1,
    depth: 2,
    // Drafts stay internal: a half-written landing page must not be servable
    // just because someone knows the URL.
    overrideAccess: false,
    user: null,
  });
  return result.docs[0] ?? null;
});

/** "", "/", "press" and "/press/" are all one page. */
export function normalisePath(path: string): string {
  const trimmed = String(path ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "/";
}

/**
 * SEO for a CMS page.
 *
 * Server-rendered so the URL unfurls with title, description and image in
 * iMessage, WhatsApp, Slack, LinkedIn and Gmail (§8).
 */
export async function metadataForPage(path: string): Promise<Metadata> {
  const page = await findPage(path);
  if (!page) return {};

  const title = (page.seoTitle as string) || (page.title as string);
  const description = (page.seoDescription as string) || undefined;
  const image =
    typeof page.seoImage === "string"
      ? page.seoImage
      : (page.seoImage as { url?: string } | null)?.url;

  return {
    title,
    description,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
