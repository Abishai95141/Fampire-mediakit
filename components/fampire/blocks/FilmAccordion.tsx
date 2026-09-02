"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * The slate as an accordion — the approved layout's module list.
 *
 * The template used it for four course modules whose only content was a list
 * of lesson titles. The slate is a better fit than that: every film already
 * carries a synopsis, an award count, a year, a status and its watch links, so
 * a closed row is a title and an open row is genuinely worth opening. Eight
 * films as eight poster cards is a wall; eight rows is a slate you can read.
 *
 * One open at a time, first open by default, so the section never starts as an
 * undifferentiated list of closed bars.
 */

export type AccordionFilm = {
  slug: string;
  title: string;
  synopsis?: string | null;
  note?: string | null;
  year?: number | null;
  awards?: number | null;
  status?: string | null;
  poster: string | null;
  watch?: { platform: string; url: string; free?: boolean }[] | null;
};

export default function FilmAccordion({ films }: { films: AccordionFilm[] }) {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  if (!films.length) return null;
  const shown = films[Math.min(open, films.length - 1)]!;

  return (
    <div className="z-layout grid gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-16">
      {/* The rail: key art for whichever film is open, so the left column is
          not a decorative still that contradicts the row you just expanded. */}
      <div className="order-last lg:order-first">
        <AnimatePresence mode="wait">
          <motion.div
            key={shown.slug}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[300px]"
          >
            {shown.poster ? (
              /**
               * No fixed ratio, and no crop.
               *
               * Half the slate has portrait key art and half has only a 16:9
               * still from its own material, so ANY single aspect ratio crops
               * one of the two badly — a 3/4 frame was cutting an 800x450
               * frame of The Guru down to 300x400 and taking most of the
               * picture with it. The rail is a fixed-width column; letting the
               * height follow the source means every film is shown whole.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown.poster}
                alt={`${shown.title} — still from its own collections`}
                className="h-auto w-full rounded-[16px]"
              />
            ) : (
              <div
                className="flex w-full items-end rounded-[16px] bg-[#ece9e4] p-4"
                style={{ aspectRatio: "3 / 4" }}
              >
                <span className="z-label">{shown.title}</span>
              </div>
            )}
            <p className="z-body mt-4 text-[13px]">
              {[
                shown.awards ? `${shown.awards} award${shown.awards === 1 ? "" : "s"}` : null,
                shown.year ? String(shown.year) : null,
                /* "released" / "in-production" are stored as machine values;
                   printing them raw put a lower-case word at the end of an
                   otherwise typeset line. */
                shown.status ? shown.status.replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase()) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="flex flex-col">
        {films.map((f, i) => {
          const on = i === Math.min(open, films.length - 1);
          return (
            <li key={f.slug} className="border-t" style={{ borderColor: "var(--z-rule)" }}>
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`film-panel-${f.slug}`}
                  onClick={() => setOpen(on ? -1 : i)}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 rounded-[10px] px-4 py-6 text-left transition-colors sm:px-6"
                  style={{
                    background: on ? "var(--z-ink)" : "transparent",
                    color: on ? "var(--z-ground)" : "var(--z-ink)",
                  }}
                >
                  <span
                    className="w-[54px] shrink-0 text-[11px] uppercase tracking-[0.14em]"
                    style={{ opacity: on ? 0.7 : 0.45 }}
                  >
                    Film
                  </span>
                  <span className="min-w-0 flex-1 text-[clamp(17px,2vw,21px)] font-medium tracking-[-0.01em]">
                    {f.title}
                  </span>
                  <span
                    className="text-[15px] tabular-nums"
                    style={{ opacity: on ? 0.7 : 0.35 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden className="w-4 text-center text-[17px] leading-none">
                    {on ? "−" : "+"}
                  </span>
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {on ? (
                  <motion.div
                    id={`film-panel-${f.slug}`}
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-8 pt-5 sm:px-6">
                      {f.synopsis || f.note ? (
                        <p className="z-body max-w-[62ch] text-[15px]">{f.synopsis ?? f.note}</p>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        {(f.watch ?? []).map((w) => (
                          <a
                            key={w.platform + w.url}
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-[8px] border px-4 py-2 text-[13px] font-medium transition-colors"
                            style={{ borderColor: "var(--z-ink)", color: "var(--z-ink)" }}
                          >
                            {w.platform}
                            {w.free ? <span style={{ opacity: 0.5 }}>· free</span> : null}
                            <span aria-hidden>↗</span>
                          </a>
                        ))}
                        <Link
                          href={`/library?film=${encodeURIComponent(f.title)}`}
                          className="text-[13px] font-medium underline underline-offset-4"
                        >
                          Collections from this film →
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
