"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Recap } from "@/components/fampire/blocks/RecapRow";

/**
 * "Lately", as the approved reference draws it: three panels on a turntable,
 * the centre one playing, the flanking two raked away in perspective.
 *
 * The scrubber and the filmstrip under it are the reason these files are now
 * hosted rather than linked. A Google Drive `/preview` is a cross-origin
 * iframe: you cannot read its currentTime, you cannot seek it, and you cannot
 * draw anything over it. Every part of the reference below the picture —
 * elapsed/total, the draggable playhead, the frames — needs a real <video>
 * element, which needs a file this origin can serve with range requests. The
 * client authorised hosting these three for exactly that.
 *
 * Everything is still CMS-driven: the URLs live on the block, so swapping a
 * recap is an edit, not a deploy.
 */

export type CoverRecap = Recap & {
  videoUrl?: string | null;
  stripUrl?: string | null;
};

const clock = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function RecapCoverflow({
  heading,
  intro,
  margin,
  recaps,
}: {
  heading?: string | null;
  intro?: string | null;
  margin?: string | null;
  recaps: CoverRecap[];
}) {
  const [i, setI] = useState(Math.min(1, recaps.length - 1));
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const vid = useRef<HTMLVideoElement | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const n = recaps.length;

  const go = useCallback(
    (next: number) => {
      setI(((next % n) + n) % n);
      setPlaying(false);
      setT(0);
      setDur(0);
    },
    [n],
  );

  // Arrow keys move the turntable, which is what anyone tries first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowRight") go(i + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seekTo = (clientX: number) => {
    const el = bar.current;
    const v = vid.current;
    if (!el || !v || !dur) return;
    const r = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    v.currentTime = pct * dur;
    setT(v.currentTime);
  };

  if (!n) return null;
  const pct = dur ? (t / dur) * 100 : 0;

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      {/* The ticker. In the reference it is a hard black band that separates
          this section from the white above it. */}
      <div
        className="mb-12 flex items-center justify-between gap-6 px-6 py-4 sm:mb-16 sm:px-10"
        style={{ background: "#121212", color: "#fff" }}
      >
        <p className="text-[10px] tracking-[0.24em] uppercase" style={{ opacity: 0.62 }}>
          Stories / People / A family in motion
        </p>
        <p className="hidden text-[10px] tracking-[0.24em] uppercase sm:block" style={{ opacity: 0.62 }}>
          Film changes things
        </p>
      </div>

      <div className="z-wrap">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            {heading ? (
              <h2 className="z-h2" style={{ fontSize: "clamp(44px,7vw,92px)", fontWeight: 400 }}>
                {heading}
              </h2>
            ) : null}
            {intro ? (
              <p
                className="max-w-[24ch] pt-3 text-[19px] leading-[1.35]"
                style={{ fontFamily: "var(--font-hand), cursive", color: "var(--z-ink)" }}
              >
                {intro}
              </p>
            ) : null}
          </div>

          {margin ? (
            <p
              className="hidden max-w-[16ch] pt-2 text-right text-[19px] leading-[1.4] lg:block"
              style={{
                fontFamily: "var(--font-hand), cursive",
                color: "var(--z-ink)",
                borderBottom: "1px solid var(--z-ink)",
                paddingBottom: 6,
                /* The note is written as three short lines and must stay
                   three short lines; without this it reflowed into a
                   paragraph and stopped reading as a margin annotation. */
                whiteSpace: "pre-line",
              }}
            >
              {margin}
            </p>
          ) : null}
        </div>
      </div>

      {/* The turntable. `perspective` on the parent and rotateY on the panels
          is what rakes the outer two away; without the parent perspective the
          rotation is a flat squash. */}
      <div
        className="relative mt-10 flex items-center justify-center sm:mt-14"
        style={{ perspective: "1800px", minHeight: "clamp(300px,42vw,560px)" }}
      >
        {recaps.map((r, idx) => {
          let off = idx - i;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const centre = off === 0;
          if (Math.abs(off) > 1) return null;

          return (
            <motion.div
              key={r.id}
              className="absolute"
              style={{ zIndex: centre ? 3 : 1, transformStyle: "preserve-3d" }}
              initial={false}
              animate={
                reduce
                  ? { opacity: centre ? 1 : 0.4 }
                  : {
                      x: `${off * 46}%`,
                      rotateY: off * -34,
                      scale: centre ? 1 : 0.9,
                      opacity: centre ? 1 : 0.85,
                      filter: centre ? "brightness(1)" : "brightness(0.72)",
                    }
              }
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className={`relative overflow-hidden rounded-[10px] bg-black ${centre ? "z-cover-centre" : "z-cover-side"}`}
                style={{ width: "min(76vw, 780px)", aspectRatio: "16 / 9" }}
              >
                {centre && r.videoUrl ? (
                  <>
                    <video
                      ref={vid}
                      src={r.videoUrl}
                      poster={r.poster ?? undefined}
                      playsInline
                      /* Nothing but the poster until someone asks: three
                         1080p files is 135MB, and a landing page must not
                         spend that on arrival. */
                      preload="none"
                      className="h-full w-full object-cover"
                      onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
                      onEnded={() => setPlaying(false)}
                      onClick={toggle}
                    />

                    <span className="pointer-events-none absolute left-5 top-4 text-[10px] tracking-[0.22em] text-white uppercase" style={{ opacity: 0.8 }}>
                      {r.when ?? "Latest"}
                    </span>
                    <span className="pointer-events-none absolute right-5 top-4 text-[11px] tabular-nums text-white" style={{ opacity: 0.85 }}>
                      {clock(t)} / {clock(dur)}
                    </span>

                    {!playing ? (
                      <button
                        type="button"
                        onClick={toggle}
                        aria-label={`Play ${r.who}'s recap`}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(10,10,10,.28)" }}
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 transition-transform duration-300 hover:scale-110">
                          <svg width="17" height="19" viewBox="0 0 15 17" fill="#121212" style={{ marginLeft: 3 }}>
                            <path d="M0 0v17l15-8.5z" />
                          </svg>
                        </span>
                      </button>
                    ) : null}

                    {/* Scrubber + filmstrip. */}
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8" style={{ background: "linear-gradient(transparent,rgba(6,6,6,.86) 42%)" }}>
                      <div
                        ref={bar}
                        role="slider"
                        tabIndex={0}
                        aria-label="Seek"
                        aria-valuemin={0}
                        aria-valuemax={Math.round(dur)}
                        aria-valuenow={Math.round(t)}
                        onKeyDown={(e) => {
                          const v = vid.current;
                          if (!v) return;
                          if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
                          if (e.key === "ArrowRight") v.currentTime = Math.min(dur, v.currentTime + 5);
                        }}
                        onPointerDown={(e) => {
                          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                          seekTo(e.clientX);
                        }}
                        onPointerMove={(e) => {
                          if (e.buttons === 1) seekTo(e.clientX);
                        }}
                        className="relative mb-2 h-[3px] w-full cursor-pointer rounded-full"
                        style={{ background: "rgba(255,255,255,.28)" }}
                      >
                        <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
                        <span
                          className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-white"
                          style={{ left: `${pct}%` }}
                        />
                      </div>

                      {r.stripUrl ? (
                        /* Real frames from this video, tiled by ffmpeg into one
                           strip — so the row under the bar is the film itself,
                           not ten copies of the poster. */
                        <button
                          type="button"
                          aria-label="Seek by frame"
                          onClick={(e) => seekTo(e.clientX)}
                          className="block h-11 w-full overflow-hidden rounded-[3px] opacity-80 transition-opacity hover:opacity-100"
                          style={{
                            backgroundImage: `url(${r.stripUrl})`,
                            backgroundSize: "auto 100%",
                            backgroundRepeat: "repeat-x",
                          }}
                        />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    {r.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                    <span className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(8,8,8,.72),rgba(8,8,8,.18))" }} />
                    <div className="absolute inset-0 flex flex-col justify-center px-8 text-white sm:px-12">
                      <span className="text-[10px] tracking-[0.24em] uppercase" style={{ opacity: 0.75 }}>
                        {r.when ?? "Latest"}
                      </span>
                      <p
                        className="mt-2 font-medium"
                        style={{ fontSize: "clamp(26px,3.2vw,44px)", letterSpacing: "-0.02em" }}
                      >
                        {r.who}
                      </p>
                      {r.blurb ? (
                        <p className="mt-3 max-w-[30ch] text-[11px] leading-[1.7] tracking-[0.08em] uppercase" style={{ opacity: 0.82 }}>
                          {r.blurb}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => go(idx)}
                        className="mt-6 inline-flex w-fit items-center gap-3 text-[11px] tracking-[0.2em] uppercase"
                      >
                        Watch recap <span aria-hidden>→</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="Previous recap"
              className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-colors sm:left-8"
              style={{ borderColor: "var(--z-ink)", color: "var(--z-ink)", background: "var(--z-ground)" }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="Next recap"
              className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border transition-colors sm:right-8"
              style={{ borderColor: "var(--z-ink)", color: "var(--z-ink)", background: "var(--z-ground)" }}
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {/* The index rail. */}
      <div className="z-wrap mt-12 sm:mt-16">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {recaps.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => go(idx)}
              className="flex items-center gap-4 text-[11px] tracking-[0.18em] uppercase transition-opacity"
              style={{ opacity: idx === i ? 1 : 0.4, fontWeight: idx === i ? 600 : 400 }}
            >
              <span className="tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
              <span>{r.who}</span>
              {idx < n - 1 ? (
                <span aria-hidden className="ml-2 hidden h-px w-16 sm:block" style={{ background: "var(--z-ink)", opacity: 0.25 }} />
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: "var(--z-ink)" }} />
        </div>
      </div>

      <div className="z-wrap mt-14 flex flex-wrap items-center justify-between gap-4">
        <Link href="/library" className="inline-flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase">
          Archive more <span aria-hidden>→</span>
        </Link>
        <p className="text-[11px] tracking-[0.2em] uppercase" style={{ opacity: 0.45 }}>
          Family / Film / Forever
        </p>
      </div>
    </section>
  );
}
