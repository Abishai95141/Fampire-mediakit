"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { HERO_READY_EVENT } from "@/components/fampire/HeroVideo";

/**
 * The FAMPIRE first-load curtain.
 *
 * Deliberately the opposite of the HNN preloader in every dimension, because
 * the two products should not feel like one product with two skins:
 *
 *              HNN                         FAMPIRE
 *   ground     near-black                  white
 *   subject    the logotype, as an image   the word, set as live type
 *   motion     fade + rise                 glyphs rising under a mask
 *   progress   a filling bar + percentage  a count of what's in the catalog
 *   exit       one plane lifts upward      the plane splits and parts sideways
 *
 * The frame that draws around the wordmark is a printer's crop mark — this is
 * a media kit, and the mark says so without a word of explanation. The same
 * mask-rise gesture continues into the hero headline, so the page reads as one
 * movement rather than a loader followed by a website.
 */

/**
 * Whether the curtain has already played in THIS document.
 *
 * Module scope, deliberately, and not sessionStorage. The distinction is the
 * whole behaviour:
 *
 *   client-side navigation (Films → back home)  same document, flag survives,
 *                                               curtain does NOT replay — and
 *                                               it does not need to, because
 *                                               user activation survives too
 *   reload / new tab                            new document, flag resets,
 *                                               curtain plays again — and it
 *                                               MUST, because activation is
 *                                               gone and the curtain is how
 *                                               the sound is re-acquired
 *
 * sessionStorage got the second case wrong: it persisted across reloads, so
 * the curtain was suppressed exactly when it was needed and the hero came
 * back silent.
 */
let playedThisDocument = false;
/** Long enough for the glyphs to land and the count to run; not a second more. */
const HOLD_MS = 2100;
/** When the entry prompt appears — late enough not to interrupt the type
 *  setting itself, early enough that nobody wonders if the page is stuck. */
const PROMPT_AT_MS = 1300;
/**
 * How long the curtain waits to be dismissed before lifting on its own.
 *
 * The curtain is the sound gate. Browsers refuse audible autoplay until the
 * visitor has genuinely interacted with the page, and the click here is that
 * interaction — it is the only reason the hero can arrive with audio, and
 * because activation is sticky for the life of the document, it is also why
 * the audio is still there after browsing to the Films page and back.
 *
 * A curtain that waits forever is a broken page, so it lifts by itself after
 * this, silently.
 */
const ENTRY_WAIT_MS = 6000;
/** How long the curtain may linger AFTER the visitor has asked to come in.
 *  Short: they have acted, and the skeleton behind covers the rest. */
const POST_ENTRY_GRACE_MS = 650;
/** Absolute cap for the machinery — fonts, the hero handshake. */
const MAX_WAIT_MS = 4200;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const WORD = "FAMPIRE".split("");

/** The four crop-mark corners. Each is an L of two hairlines anchored at the
 *  corner point and drawn outward — `origin-*` decides which end stays put. */
const CORNERS = [
  { key: "tl", box: "-left-6 -top-6 sm:-left-10 sm:-top-10", h: "left-0 top-0 origin-left", v: "left-0 top-0 origin-top" },
  { key: "tr", box: "-right-6 -top-6 sm:-right-10 sm:-top-10", h: "right-0 top-0 origin-right", v: "right-0 top-0 origin-top" },
  { key: "bl", box: "-bottom-6 -left-6 sm:-bottom-10 sm:-left-10", h: "bottom-0 left-0 origin-left", v: "bottom-0 left-0 origin-bottom" },
  { key: "br", box: "-bottom-6 -right-6 sm:-bottom-10 sm:-right-10", h: "bottom-0 right-0 origin-right", v: "bottom-0 right-0 origin-bottom" },
] as const;

/** Half of the split curtain. Both halves render the same composition; the
 *  right one is offset by a full negative viewport width inside its own
 *  overflow-hidden box, so together they reconstruct one centred image that
 *  then tears cleanly down the middle. */
function Half({
  side,
  count,
  armed,
}: {
  side: "left" | "right";
  count: number;
  armed: boolean;
}) {
  return (
    <motion.div
      className={`absolute inset-y-0 w-1/2 overflow-hidden bg-white ${
        side === "left" ? "left-0" : "right-0"
      }`}
      initial={{ x: 0 }}
      exit={{
        x: side === "left" ? "-100%" : "100%",
        transition: { duration: 1.05, ease: EASE },
      }}
    >
      <div
        className="absolute inset-y-0 w-screen"
        style={{ left: side === "left" ? 0 : "-100%" }}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {/* Crop marks. Two hairlines per corner, drawn outward from the
              corner point, framing the wordmark like a trim box. */}
          <div className="relative">
            {CORNERS.map((c, i) => (
              <div key={c.key} aria-hidden className={`absolute ${c.box}`}>
                <motion.div
                  className={`absolute ${c.h} h-px w-8 bg-black/25 sm:w-12`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.05 }}
                />
                <motion.div
                  className={`absolute ${c.v} h-8 w-px bg-black/25 sm:h-12`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.05 }}
                />
              </div>
            ))}

            {/* The word, one glyph per mask. aria-label carries the readable
                string so the split-up letters are never read out letter by
                letter. */}
            <div
              className="flex items-end"
              aria-label="FAMPIRE"
              role="img"
            >
              {WORD.map((ch, i) => (
                <span key={i} className="block overflow-hidden" aria-hidden>
                  <motion.span
                    className="fam-display block text-[13vw] leading-[0.86] text-black sm:text-[9vw] lg:text-[7.5vw]"
                    initial={{ y: "115%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 1, ease: EASE, delay: 0.22 + i * 0.055 }}
                  >
                    {ch}
                  </motion.span>
                </span>
              ))}
            </div>

            <motion.div
              className="mt-5 flex items-baseline justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
            >
              <span className="fam-eyebrow">Media Center</span>
              <span className="text-[11px] tabular-nums tracking-[0.18em] text-black/35">
                {String(count).padStart(3, "0")}
              </span>
            </motion.div>

            <motion.div
              className="mt-3 h-px w-full origin-left bg-black/15"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
            />

            {/* Breathing rather than blinking — noticed without behaving
                like an alert. */}
            <motion.p
              aria-hidden
              className="fam-meta mt-10 text-center text-[11px] uppercase tracking-[0.28em] text-black/55"
              initial={{ opacity: 0 }}
              animate={armed ? { opacity: [0.45, 1, 0.45] } : { opacity: 0 }}
              transition={
                armed
                  ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 }
              }
            >
              Click anywhere to enter
            </motion.p>

          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Preloader({
  /** How many catalog collections exist — the count reads out during the hold,
   *  which tells a visitor what this place is faster than a tagline would. */
  total,
  onReveal,
  onDone,
}: {
  total: number;
  /** Fired as the curtain STARTS parting, so the page fades up behind it
   *  during the split instead of after — no flash of empty white. */
  onReveal: () => void;
  /** Fired exactly once, whether the curtain played or was skipped. */
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  /** The prompt only appears once the type has landed. */
  const [armed, setArmed] = useState(false);
  const enterRef = useRef<(() => void) | null>(null);
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();

  useEffect(() => {
    if (playedThisDocument || reduceMotion) {
      onDone();
      return;
    }
    playedThisDocument = true;

    // The decision can't be a lazy initialiser: it depends on module state
    // that differs between server and client, so reading it during render
    // would be a hydration mismatch. Runs once, on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Suspend the smooth-scroll instance rather than setting
    // `body { overflow: hidden }`. Hiding the body's overflow underneath a
    // running Lenis leaves its cached scroll limit measured against a
    // zero-height document; when the curtain lifts it maps every wheel delta
    // against that stale number, which reads as the page scrolling at the
    // wrong speed until something else forces a resize.
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    if (!lenis) document.body.style.overflow = "hidden";

    // The count eases toward the total rather than running linearly, so it
    // lands with the type instead of hitting the number and sitting there.
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / HOLD_MS);
      setCount(Math.round(total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const fontsReady =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();
    const hold = new Promise<void>((r) => setTimeout(r, HOLD_MS));
    const failSafe = new Promise<void>((r) => setTimeout(r, MAX_WAIT_MS));

    // The curtain is what buys the hero video its buffering time. Lifting on a
    // timer alone is how you get a black rectangle for the first second of the
    // page; waiting for the video to actually report playback is the whole
    // reason this preloader exists on a video-led page.
    //
    // `waitForHero` never rejects and never hangs: HeroVideo fires the event
    // itself after 3.4s whether or not the player cooperated, and failSafe
    // covers the case where no HeroVideo is mounted at all.
    let releaseHero: () => void = () => {};
    const heroReady = new Promise<void>((resolve) => {
      releaseHero = resolve;
      window.addEventListener(HERO_READY_EVENT, () => resolve(), { once: true });
    });

    // The visitor's way in. Resolving this is what carries user activation into
    // the document — the whole reason the hero can be audible, here and on
    // every later return to this page.
    let entered: () => void = () => {};
    const entry = new Promise<void>((resolve) => {
      entered = resolve;
    });
    enterRef.current = () => entered();

    const promptTimer = setTimeout(() => setArmed(true), PROMPT_AT_MS);
    const entryTimer = setTimeout(() => entered(), ENTRY_WAIT_MS);

    let cancelled = false;
    // Two gates in sequence, not one race. First the human — nothing lifts
    // until they have come through (or entryTimer gives up on them). Then a
    // SHORT grace for the picture, because somebody who has just clicked is
    // done waiting, and the skeleton behind covers whatever the player has
    // not finished.
    entry
      .then(() =>
        Promise.race([
          Promise.all([hold, fontsReady, heroReady]),
          failSafe,
          new Promise<void>((r) => setTimeout(r, POST_ENTRY_GRACE_MS)),
        ]),
      )
      .then(() => {
        if (cancelled) return;
        onReveal();
        setVisible(false);
      });

    return () => {
      cancelled = true;
      releaseHero();
      entered();
      clearTimeout(promptTimer);
      clearTimeout(entryTimer);
      cancelAnimationFrame(raf);
      if (lenis) {
        // Measure the real document before handing scrolling back.
        lenis.resize();
        lenis.start();
      } else {
        document.body.style.overflow = prevOverflow;
      }
    };
    // onReveal is stable; re-subscribing on its identity would restart the
    // timers. Keyed on `visible` alone, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, lenis]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible ? (
        <motion.div key="fam-preloader" className="fixed inset-0 z-[100]" exit={{}}>
          <Half side="left" count={count} armed={armed} />
          <Half side="right" count={count} armed={armed} />

          {/*
            The entire curtain is the way in, as one real button.

            It must be a button and not a div with an onClick: Enter and Space
            have to work too, because a keypress carries user activation
            exactly as a click does, and a keyboard visitor should not be the
            one person who gets a silent hero.

            This is the only interaction in FAMPIRE that exists for a technical
            reason rather than an editorial one — browsers will not start media
            audibly until someone has genuinely interacted with the page — and
            it is folded into something the visitor was going to look at anyway.
          */}
          <button
            type="button"
            onClick={() => enterRef.current?.()}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent"
          >
            <span className="sr-only">Enter the FAMPIRE Media Center</span>
          </button>

        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
