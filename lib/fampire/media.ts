/**
 * Remote imagery helpers.
 *
 * FAMPIRE hosts nothing, images included — every photograph on these pages is
 * served from the client's own CDN, exactly like every asset in the catalog.
 * That keeps one rule for the whole product instead of "links are remote but
 * pictures are ours".
 */

/**
 * Wix encodes the delivery transform in the path: `/v1/fill/w_1600,h_901,al_c/`.
 * Rewriting that segment asks their CDN for the size we actually intend to
 * display, instead of shipping a 2500px original into a 480px card.
 */
export function wixImage(url: string | null, width: number, height: number): string | null {
  if (!url) return null;
  if (!url.includes("static.wixstatic.com")) return url;
  const [base, rest] = url.split("/v1/");
  if (!rest) return url;
  // Keep the filename Wix appends after the transform — it 404s without it.
  const tail = rest.split("/").slice(-1)[0];
  return `${base}/v1/fill/w_${width},h_${height},al_c,q_82/${tail}`;
}

/**
 * The hero film. Swapping the whole hero is a four-line edit here — the point
 * of keeping it as data rather than markup.
 */
export const HERO = {
  videoId: "1025829605",
  posterHash:
    "1945487480-05af284dfbfcde23cfbb30292c057ff7ca1842ac49cb5f6dce06ef5bdde4664e",
  title: "Biohack Yourself — Directors Trailer",
  watchHref: "https://vimeo.com/1025829605",
  credit: "Biohack Yourself · Directors Trailer · Lolli Brands Entertainment",
  /** Seconds to skip. The trailer opens on a burned-in title card; starting
   *  past it means the hero is photography from its first frame. */
  startAt: 48,
  /**
   * The skeleton shown until the player reports it is actually running —
   * which matters most on a RETURN visit, where the preloader is suppressed
   * (once per tab session) and there is nothing else covering the panel.
   *
   * The family portrait: all four Lollis, landscape, no burned-in titling. It
   * is a specific frame out of Anthony's "Bio & Headshots" folder — the one
   * the client publishes on their own media-kit page for press to use freely —
   * rather than an entry-level preview, because the folder's cover frame is
   * not the picture we want.
   *
   * NOTE FOR SIGN-OFF: this photograph includes Love and Legend. It is already
   * published by the family themselves in a press folder offered for
   * unrestricted use, which is why it is used here, but it belongs on the list
   * a named person confirms before launch (build plan §9). Swapping it is a
   * one-line change.
   */
  skeletonFileId: "10EFWwai2Egr5RolaUveEJVZxK-vZ6WEQ",
} as const;

/** The hero skeleton, at a size worth the width it fills. */
export const heroSkeleton = () =>
  `https://drive.google.com/thumbnail?id=${HERO.skeletonFileId}&sz=w1600`;
