import type { Metadata } from "next";
import { notFound } from "next/navigation";

import RenderBlocks from "@/components/fampire/RenderBlocks";
import EditBar from "@/components/fampire/EditBar";
import { isSignedIn } from "@/lib/fampire/auth";
import { facetsFromParams } from "@/lib/fampire/catalog";
import { findPage, metadataForPage } from "@/lib/fampire/page";

/**
 * Every page on the site except the landing page, which `page.tsx` serves at
 * `/` for the same records through the same renderer.
 *
 * This used to be the LAST route matched, deliberately losing to the real
 * files at `/library`, `/films`, `/people` and `/press` so an editor could not
 * shadow a built surface. Those files are gone: each of them is a Page record
 * now, assembled from blocks like everything else. The route that once had to
 * defer to hardcoded surfaces is the only one left.
 */

export const dynamic = "force-dynamic";

type Args = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  return metadataForPage(`/${slug.join("/")}`);
}

/**
 * Well-known files the catch-all must not answer for.
 *
 * `/robots.txt` was being matched by this route and rendered as a missing CMS
 * page, so the metadata route never got a chance to serve it.
 */
const RESERVED_FILES = new Set([
  "robots.txt", "sitemap.xml", "favicon.ico", "manifest.json", "site.webmanifest",
]);

export default async function CmsPage({ params, searchParams }: Args) {
  const { slug } = await params;
  if (slug.length === 1 && RESERVED_FILES.has(slug[0]!)) notFound();

  const page = await findPage(`/${slug.join("/")}`);
  if (!page) notFound();

  // Read here rather than inside the Library block: searchParams are a
  // property of the REQUEST, and a block three levels down cannot reach them.
  const facets = facetsFromParams(await searchParams);
  const signedIn = await isSignedIn();

  // A page that shows the catalog should also be a place you can add to it.
  const carriesLibrary = (page.layout as { blockType?: string }[] | null)?.some(
    (b) => b.blockType === "libraryBrowser",
  );

  return (
    <>
      <EditBar
        collection="pages"
        id={page.id}
        label={String(page.title)}
        extra={
          carriesLibrary
            ? { href: "/admin/collections/entries/create", label: "Add a collection" }
            : undefined
        }
      />
      <RenderBlocks blocks={page.layout ?? []} facets={facets} signedIn={signedIn} pageId={page.id} />
    </>
  );
}
