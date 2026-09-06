"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * "Lately" — the recap reels, one per member of the family.
 *
 * The landing page could say what the institution IS and what it has made,
 * but nothing on it carried a sense of RECENCY: a visitor had no way to tell
 * whether the family shot something last week or in 2022. This is that.
 *
 * Nothing here is rehosted. The poster is Google's own thumbnail endpoint for
 * the file and the player is Drive's `/preview`, both addressed by file id —
 * which is the project's standing rule (link and describe, never copy) applied
 * to video rather than to a folder. It also means a recap swapped in Drive
 * updates here with no upload and no deploy.
 *
 * The player opens in a dialog rather than replacing the card, so the row
 * keeps its place on the page and Escape gets you out.
 */

export type Recap = {
  id: string;
  fileId: string;
  who: string;
  title?: string | null;
  blurb?: string | null;
  when?: string | null;
  poster: string | null;
};

export default function RecapRow({ recaps }: { recaps: Recap[] }) {
  const [open, setOpen] = useState<Recap | null>(null);
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    // Send focus back where it came from, or the reader is dumped at the top
    // of the document with no idea what just happened.
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // The dialog covers the page; letting the page scroll behind it is the
    // classic modal bug.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!recaps.length) return null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recaps.map((r, i) => (
          <motion.div
            key={r.id}
            initial={reduce ? false : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setOpen(r);
              }}
              className="group block w-full overflow-hidden rounded-[18px] text-left transition-transform duration-500 hover:-translate-y-1"
              style={{ background: "var(--z-panel, #f4f2ee)" }}
            >
              <div className="relative overflow-hidden bg-[#ddd9d3]" style={{ aspectRatio: "16 / 9" }}>
                {r.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.poster}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : null}
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center transition-colors"
                  style={{ background: "rgba(18,18,18,.18)" }}
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                    style={{ background: "rgba(255,255,255,.94)", color: "#121212" }}
                  >
                    {/* A triangle, nudged right so it reads as centred. */}
                    <svg width="15" height="17" viewBox="0 0 15 17" fill="currentColor" style={{ marginLeft: 3 }}>
                      <path d="M0 0v17l15-8.5z" />
                    </svg>
                  </span>
                </span>
              </div>

              <div className="p-6">
                {r.when ? <p className="z-label">{r.when}</p> : null}
                <p
                  className="mt-2 font-medium"
                  style={{ fontSize: "clamp(19px,2.1vw,25px)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
                >
                  {r.who}
                </p>
                {r.blurb ? <p className="z-body mt-3 text-[14px]">{r.blurb}</p> : null}
                <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium">
                  Watch the recap
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
            style={{ background: "rgba(10,10,10,.86)" }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${open.who} — recap`}
            onClick={close}
          >
            <motion.div
              className="w-full max-w-[1100px]"
              initial={reduce ? false : { scale: 0.97, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={reduce ? undefined : { scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-[13px] tracking-[0.1em] text-white/70 uppercase">
                  {open.who}
                  {open.when ? ` · ${open.when}` : ""}
                </p>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  className="rounded-full px-4 py-2 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Close ✕
                </button>
              </div>

              <div className="overflow-hidden rounded-[14px] bg-black" style={{ aspectRatio: "16 / 9" }}>
                {/* Drive's own player. Nothing is downloaded, re-encoded or
                    served from here — the file stays where the family put it. */}
                <iframe
                  src={`https://drive.google.com/file/d/${open.fileId}/preview`}
                  title={`${open.who} — recap`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                  style={{ border: 0 }}
                />
              </div>

              <a
                href={`https://drive.google.com/file/d/${open.fileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-[13px] text-white/70 underline underline-offset-4 hover:text-white"
              >
                Open in Google Drive ↗
              </a>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
