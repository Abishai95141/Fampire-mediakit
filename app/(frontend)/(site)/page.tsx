import type { Metadata } from "next";
import { notFound } from "next/navigation";

import RenderBlocks from "@/components/fampire/RenderBlocks";
import EditBar from "@/components/fampire/EditBar";
import { isSignedIn } from "@/lib/fampire/auth";
import { facetsFromParams } from "@/lib/fampire/catalog";
import { findPage, metadataForPage } from "@/lib/fampire/page";

/**
 * The front door — a CMS page like every other.
 *
 * This was 402 lines of hardcoded JSX: the family bios, the institution
 * paragraph, the section numbering and "eight issues · 4,300+ retail
 * locations" were all typed into the file. Which meant the one page the client
 * most wants to change was the one page they could not, and the page builder
 * looked like a feature that did not apply to the site they actually had.
 *
 * The design did not change; it moved. Every section above is now a block on
 * the `/` page record, in the same order, rendering through the same
 * components.
 *
 * Public by design: no login, no email capture, no gate in front of anything
 * on this page.
 */

/**
 * Request-scoped, not prerendered.
 *
 * `force-static` would freeze the public/private split into the build output —
 * flipping an entry to private would not remove it from this page until the
 * next deploy (§2.6). React caches the queries per request, so the cost is one
 * round trip, not one per block.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPage("/");
}

export default async function FampireHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = await findPage("/");
  if (!page) notFound();

  const facets = facetsFromParams(await searchParams);
  const signedIn = await isSignedIn();

  return (
    <>
      <EditBar collection="pages" id={page.id} label={String(page.title)} />
      {/**
       * The Zeen scope.
       *
       * Everything the approved landing layout changes — Geist, the 128/64/48
       * display scale, the white ground in place of the template's cream, the
       * light/dark band rhythm — lives under this one class in globals.css.
       *
       * That is deliberate, and it is what satisfies the brief's "handled in a
       * way that does not require changes to the other pages": /library,
       * /films, /people and /press render from the same components and never
       * match any of those selectors. Deleting this wrapper reverts the
       * landing page to the house style with nothing else to undo.
       */}
      <div className="zeen">
        <RenderBlocks blocks={page.layout ?? []} facets={facets} signedIn={signedIn} />
      </div>
    </>
  );
}
