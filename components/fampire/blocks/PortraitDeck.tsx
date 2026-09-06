"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import ItemControls from "@/components/fampire/ItemControls";

/**
 * The fanned deck of portraits in the landing hero.
 *
 * Client-side only because it animates; the CMS read that decides WHOSE
 * portraits these are happens on the server in ZeenBlocks and arrives here
 * already resolved. That split is what lets the hero be CMS-driven without
 * shipping Payload to the browser.
 *
 * The fan is computed from the card's distance off centre rather than
 * hardcoded per card, so the shape holds whether the CMS returns three people
 * or five — which it must, because an editor adding a family member changes
 * the count with no code change.
 */

export type DeckCard = {
  slug: string;
  name: string;
  src: string | null;
  /**
   * The row id, carried as DATA.
   *
   * This was briefly an `idFor(slug)` callback passed down from the server
   * component, which React refuses outright — "Functions cannot be passed
   * directly to Client Components" — and which took the whole landing page to
   * a 500 in production. Props that cross that boundary have to serialise.
   */
  id?: number | string | null;
};

export default function PortraitDeck({
  cards,
  signedIn = false,
  pageId,
  blockIndex,
}: {
  cards: DeckCard[];
  signedIn?: boolean;
  pageId?: number | string;
  blockIndex?: number;
}) {
  const reduce = useReducedMotion();
  const n = cards.length;
  if (!n) return null;
  const mid = (n - 1) / 2;

  return (
    <div className="relative flex items-end justify-center" style={{ perspective: 1200 }}>
      {cards.map((c, i) => {
        const off = i - mid;
        const dist = Math.abs(off);
        // Measured off the approved layout: ~9° between neighbours, each step
        // out sits lower and slightly smaller, and the centre card is in front.
        const rotate = off * 9;
        const y = dist * 40;
        const scale = 1 - dist * 0.06;

        return (
          <motion.div
            key={c.slug}
            className="fam-item relative"
            style={{
              zIndex: n - dist,
              /**
               * Wider cards, and far less overlap.
               *
               * The deck was reading as crowded because the cards were both
               * small and pulled together by up to 26px each side, so four
               * portraits occupied barely half the row while the rest of the
               * hero sat empty. They are now up to 290px with the overlap cut
               * to ~10px — enough for the fan to still read as one deck rather
               * than four separate pictures, and the fan spreads across the
               * width it was already reserving.
               */
              width: `clamp(124px, ${19 - dist * 0.8}vw, ${290 - dist * 16}px)`,
              marginInline: "clamp(-14px, -1vw, -4px)",
            }}
            initial={reduce ? false : { opacity: 0, y: y + 60, rotate: 0, scale: scale * 0.94 }}
            animate={{ opacity: 1, y, rotate, scale }}
            transition={{
              // Centre first, then outward — the deck reads as being dealt.
              delay: reduce ? 0 : 0.08 * dist,
              duration: 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={reduce ? undefined : { y: y - 16, scale: scale * 1.03 }}
          >
            <ItemControls
              signedIn={signedIn}
              pageId={pageId}
              blockIndex={blockIndex}
              collection="people"
              id={c.id ?? null}
              label={c.name}
            />
            <Link
              href={`/library?subject=${encodeURIComponent(c.slug)}`}
              aria-label={`${c.name} — see their collections`}
              className="block rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--z-ink)] focus-visible:ring-offset-4"
            >
              {c.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="z-portrait" src={c.src} alt={`${c.name}, portrait`} loading="eager" />
              ) : (
                /* No portrait yet. A labelled panel rather than a grey hole,
                   so a newly added person still reads as a person. */
                <div className="z-portrait flex items-end p-3">
                  <span className="z-label">{c.name}</span>
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
