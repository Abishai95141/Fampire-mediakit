"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
// Required Lenis stylesheet. Its `html.lenis, html.lenis body { height: auto }`
// rule is what lets Lenis measure the document's true scroll height — without
// it the root layout's `html.h-full` (height:100%) pins the page to the
// viewport, so Lenis clamps short of the real bottom and the scroll "sticks"
// near the end. Also applies `overscroll-behavior: contain` to any element
// marked `data-lenis-prevent`.
import "lenis/dist/lenis.css";

/**
 * FAMPIRE's smooth scrolling.
 *
 * A separate instance from the portal's `components/SmoothScroll.tsx` rather
 * than a reuse, for two reasons:
 *
 *  1. It WRAPS the tree instead of rendering as a sibling, which is what puts
 *     the Lenis instance on context. Without that, anything that needs to
 *     suspend scrolling — the preloader — has no handle on it and has to reach
 *     for `document.body.style.overflow` instead. Locking the body out from
 *     under a running Lenis leaves its cached scroll limit stale, and a stale
 *     limit is exactly what makes a page feel like it scrolls fast in one
 *     stretch and slow in another.
 *
 *  2. The front door is one long editorial column with a full-viewport video at
 *     the top; the portal is a rail plus dense panels. They do not want the
 *     same easing.
 *
 * Recalculates on route change and on late layout shifts, because a stale
 * measurement is the other cause of inconsistent scroll speed: Lenis maps
 * wheel delta against a document height it captured earlier, so if that height
 * changed after mount, the same gesture travels a different distance in
 * different parts of the page.
 */

function LenisMaintenance() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    if (!lenis) return;

    // A new route is a new document height, and Lenis starts at whatever
    // scroll offset it was left at.
    lenis.resize();
    lenis.scrollTo(0, { immediate: true });
  }, [lenis, pathname]);

  useEffect(() => {
    if (!lenis) return;

    // Fonts and remote thumbnails land after mount. The media wells all
    // reserve their space with `aspect-*`, so this is belt-and-braces rather
    // than load-bearing — but it costs nothing and it is the difference
    // between a scroll that is right and one that is nearly right.
    const remeasure = () => lenis.resize();

    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    window.addEventListener("load", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener("load", remeasure);
    };
  }, [lenis]);

  return null;
}

export default function FampireSmoothScroll({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  // Anyone who asked their OS for less motion gets the browser's own scroll,
  // untouched — same as every other animation in this app.
  if (reduceMotion) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        // Frame-rate-driven lerp rather than a fixed `duration`, so it stays
        // responsive to fast, repeated or reversed input instead of queueing a
        // multi-second easing curve. Kept close to 1: a low lerp lets the
        // visual scroll trail far behind the target, which is what makes
        // reversing direction near a section boundary feel like it sticks.
        lerp: 0.12,
        smoothWheel: true,
        wheelMultiplier: 1,
        // Touch devices already have momentum scrolling in hardware, and
        // smoothing on top of it is what produces the "some of it is fast,
        // some of it is slow" feel on a phone.
        syncTouch: false,
        touchMultiplier: 1,
      }}
    >
      <LenisMaintenance />
      {children}
    </ReactLenis>
  );
}
