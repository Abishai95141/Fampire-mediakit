import { cache } from "react";

/**
 * Is a given Vimeo video actually embeddable right now?
 *
 * Measured, not assumed. The client's own default trailer, for instance, is
 * NOT:
 *
 *   https://vimeo.com/1025829605              → 200  (public, watchable on Vimeo)
 *   .../api/oembed.json?url=…                 → 200  (full metadata, 316s, poster)
 *   https://player.vimeo.com/video/1025829605 → 401  (for every Referer tried)
 *
 * A public video whose PLAYER refuses everyone means embedding is switched off
 * in that video's Vimeo privacy settings ("Where can this be embedded?"). It is
 * an account-side setting; no amount of client code fixes it, and no autoplay,
 * codec, muted or playsInline change is involved. (That video now ships as a
 * self-hosted default instead — see lib/fampire/media.ts — so this probe only
 * matters for a Vimeo link someone pastes into the CMS.)
 *
 * Why check at all instead of letting the player fail: a cross-origin iframe
 * does not report a 401 to the page, so the component could only infer failure
 * from silence — it waited eleven seconds on a dead frame before falling back.
 * Asking the server first turns that into an instant, deliberate still.
 *
 * Takes the id explicitly rather than reaching for a fixed default — every
 * CMS-provided Vimeo link is its own video, with its own privacy setting, and
 * checking the same id regardless of what's actually configured meant a
 * working replacement video would still get silently vetoed by the ORIGINAL
 * trailer's embed status.
 *
 * Fails OPEN: if the probe itself errors we assume embeddable and let the
 * component's own watchdog decide, because a network blip here should not
 * suppress a working video.
 */

const PROBE_TIMEOUT_MS = 4000;

export type HeroEmbedStatus = {
  embeddable: boolean;
  /** Internal diagnostic — never rendered to the public. */
  reason: string;
};

export const heroEmbedStatus = cache(async (videoId: string): Promise<HeroEmbedStatus> => {
  const url = `https://player.vimeo.com/video/${videoId}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      // Cache for an hour: this is an account setting, not live state, and the
      // hero should not cost a round trip to Vimeo on every page view.
      next: { revalidate: 3600 },
    });

    if (res.ok) return { embeddable: true, reason: `player ${res.status}` };

    if (res.status === 401 || res.status === 403) {
      return {
        embeddable: false,
        reason:
          `player ${res.status} — embedding is disabled for this video in Vimeo. ` +
          `Fix: Vimeo → the video → Settings → Privacy → "Where can this be embedded?" ` +
          `→ Anywhere (or add the site's domain).`,
      };
    }
    if (res.status === 404) {
      return { embeddable: false, reason: "player 404 — video id no longer exists" };
    }
    return { embeddable: false, reason: `player ${res.status}` };
  } catch (err) {
    // Fail open — see the note above.
    return { embeddable: true, reason: `probe failed (${(err as Error).name}) — assuming embeddable` };
  }
});
