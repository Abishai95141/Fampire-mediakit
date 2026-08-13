import config from "@payload-config";
import { getPayload } from "payload";
import { cache } from "react";

import type { Entry } from "./catalog";
import { toEntry } from "./payload-catalog";

/**
 * One collection, by slug.
 *
 * Access control does the security here: a signed-out request runs with
 * `overrideAccess: false` and `user: null`, so Payload's own `read` rule on
 * `Entries` filters to published documents. A draft or held-back collection
 * therefore 404s for the public rather than 403-ing, which also avoids
 * confirming that a private entry exists.
 */
export const getCollection = cache(
  async (slug: string, signedIn = false): Promise<Entry | null> => {
    try {
      const payload = await getPayload({ config });

      // Found by slug alone. Entries are still tenant-scoped in the CMS — that
      // is how a contributor is limited to their brand — but a reader is in one
      // press room, so the brand never appears in the URL.
      const result = await payload.find({
        collection: "entries",
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
        draft: signedIn,
        overrideAccess: signedIn,
        ...(signedIn ? {} : { user: null }),
      });

      const doc = result.docs[0];
      return doc ? toEntry(doc as unknown as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  },
);

/**
 * Collections a reader is likely to want next.
 *
 * Ranked by how much they share with this one — same event beats same film
 * beats same person beats same kind. This is what keeps §4.5 rule 1's
 * two-click ceiling true from a detail page: everything related is one click,
 * not a trip back through the Library.
 */
export const relatedCollections = cache(
  async (entry: Entry, limit = 6): Promise<Entry[]> => {
    const { loadEntries } = await import("./payload-catalog");
    const all = await loadEntries();

    const scored = all
      .filter((e) => e.id !== entry.id)
      .map((e) => {
        let score = 0;
        if (entry.event && e.event === entry.event) score += 5;
        if (entry.film && e.film === entry.film) score += 4;
        if (entry.subjects.some((s) => e.subjects.includes(s))) score += 3;
        if (entry.occasion && e.occasion === entry.occasion) score += 2;
        if (e.kind === entry.kind) score += 1;
        if (entry.year && e.year === entry.year) score += 1;
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.e.file_count ?? 0) - (a.e.file_count ?? 0));

    return scored.slice(0, limit).map((x) => x.e);
  },
);

/**
 * The image a shared link unfurls with.
 *
 * Built from a Drive file the orientation sampler proved renders, at the 1200px
 * width the unfurl spec wants. Returns null rather than a guess when we have
 * no verified frame — a preview card with a broken image reads as a dead link.
 */
export function previewImage(entry: Entry, width = 1200): string | null {
  /**
   * An editor's chosen image wins, exactly as it does on the card.
   *
   * This read only ever looked at `preview_file_id` — the frame the orientation
   * sampler picked — so a thumbnail set by hand in the CMS appeared on the
   * Library card and then silently vanished on the collection's own page. The
   * two surfaces disagreeing about the same collection's picture is worse than
   * either one being wrong.
   *
   * `entry.preview` is already resolved (chosen → sampled) by the read layer.
   * Only the sampled form can be re-sized, because only Drive's thumbnail
   * endpoint takes a width; a hand-set URL is used as given.
   */
  const id = entry.preview_file_id;
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  return entry.preview ?? null;
}
