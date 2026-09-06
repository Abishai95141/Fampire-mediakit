"use client";

import ScrollExpand from "@/components/reactbits/ScrollExpand";

/**
 * The statement, over a picture that opens as you scroll.
 *
 * This replaces the two flanking portraits. Those were always a compromise:
 * the reference sets its type ACROSS the pictures, which works on the
 * template's flat studio portraits and fails on a red-carpet photograph, so
 * the words ended up sitting primly between two small pictures instead. One
 * frame of the whole family, opening to full bleed under the line, is the
 * thing the section was reaching for.
 *
 * The title rides on the resting frame and lifts away as the picture takes
 * over; the statement itself arrives at full bleed, which is the one moment
 * where white type on this photograph is unambiguously readable — the scrim
 * is at full strength by then.
 */
export default function ScrollStatement({
  src,
  alt,
  title,
  scrollHint,
  lines,
  notes = [],
  startWidth = 42,
  startHeight = 58,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
}: {
  src: string;
  alt?: string | null;
  title?: string | null;
  scrollHint?: string | null;
  lines: string[];
  notes?: { text: string }[];
  startWidth?: number | null;
  startHeight?: number | null;
  mediaZoom?: number | null;
  scrollDistance?: number | null;
}) {
  if (!src) return null;

  return (
    <section className="relative" style={{ background: "#0d0d0d" }}>
      <ScrollExpand
        src={src}
        alt={alt ?? ""}
        title={title ?? ""}
        scrollHint={scrollHint ?? ""}
        startWidth={startWidth ?? 42}
        startHeight={startHeight ?? 58}
        mediaZoom={mediaZoom ?? 1.35}
        scrollDistance={scrollDistance ?? 1.2}
        /* Driven by the page's own scroll. The component's alternative is its
           own inner scroller, which would trap the wheel mid-page and fight
           the site's smooth scrolling. */
        useWindowScroll
        endRadius={0}
        overlayScrim={0.62}
      >
        <div className="mx-auto w-full max-w-[900px] px-6">
          {lines.map((l, i) => (
            <p
              key={i}
              className="text-white"
              style={{
                fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
                fontSize: "clamp(28px, 5.2vw, 68px)",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                textWrap: "balance",
                textShadow: "0 2px 30px rgba(0,0,0,.5)",
              }}
            >
              {l}
            </p>
          ))}

          {notes.length ? (
            <div className="se-notes mt-10 grid gap-6 text-left sm:grid-cols-2">
              {notes.map((n, i) => (
                <p
                  key={i}
                  className="text-[14px] leading-[1.65]"
                  style={{
                    fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
                    color: "rgba(255,255,255,.78)",
                    textShadow: "0 1px 14px rgba(0,0,0,.55)",
                  }}
                >
                  {n.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </ScrollExpand>
    </section>
  );
}
