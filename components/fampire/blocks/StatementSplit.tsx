"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The approved layout's signature move: a stack of very large lines with two
 * rotated portraits sitting at the outer edges, the type running across them.
 *
 * It appears twice in the template — "You're not invisible. / You're simply
 * undiscovered." with the portraits overlapping the words, and "Be remembered.
 * / Be discovered. / Be trusted. / Be invited." with them pushed to the sides.
 * Those are the same construction at two settings, so this is one block with an
 * `overlap` switch rather than two nearly identical ones.
 *
 * The portraits come from People in the CMS, like every other face on this
 * page, so the section cannot drift out of step with who the family actually is.
 */

export type SplitPortrait = { name: string; src: string | null; tint?: string | null };

/**
 * Hoisted to module scope deliberately.
 *
 * Defined inside StatementSplit's body, this was a NEW component type on every
 * render — so React unmounted and remounted both portraits whenever the parent
 * re-rendered, replaying the `whileInView` entrance each time instead of
 * honouring `viewport={{ once: true }}`. `overlap` and `reduce` were closed
 * over; they are props now, which is the whole reason it could not be hoisted
 * before.
 */
function Portrait({
  p,
  side,
  overlap,
  reduce,
}: {
  p: SplitPortrait;
  side: "left" | "right";
  overlap: boolean;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      className={[
        "pointer-events-none select-none",
        /**
         * z-0, explicitly. In the approved layout the words run IN FRONT of
         * the pictures — that crossing is the whole effect — but these were
         * painting over the type, so "unmeasured" was half-hidden behind a
         * portrait. Leaving z-index at auto is what allowed it: the rotate
         * transform gives each portrait its own stacking context, and the
         * result depended on DOM order rather than on a decision.
         */
        "z-0",
        "z-split-portrait",
        overlap ? "absolute top-1/2 -translate-y-1/2" : "relative",
        overlap ? (side === "left" ? "left-0" : "right-0") : "",
      ].join(" ")}
      style={{ width: overlap ? "clamp(104px, 16vw, 260px)" : "clamp(110px, 15vw, 230px)" }}
      initial={reduce ? false : { opacity: 0, y: 26, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: side === "left" ? -4 : 4 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {p.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="z-portrait" src={p.src} alt="" />
      ) : (
        <div className="z-portrait" />
      )}
    </motion.div>
  );
}

export default function StatementSplit({
  lines,
  left,
  right,
  notes = [],
  overlap = false,
}: {
  lines: string[];
  left?: SplitPortrait | null;
  right?: SplitPortrait | null;
  notes?: { text: string }[];
  overlap?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <div
        className={[
          "z-split-row relative flex items-center",
          overlap ? "justify-center" : "justify-between gap-4 sm:gap-10",
        ].join(" ")}
        /**
         * The portraits are absolutely positioned and centred on this row, so
         * the row has to be at least as tall as they are. It was not: a 260px
         * card is ~347px tall against a two-line row of ~170px, so ~90px of
         * picture hung below and sat on top of the notes underneath — which is
         * why the two paragraphs were unreadable. 4/3 is the portrait ratio.
         */
        style={overlap ? { minHeight: "calc(clamp(104px, 16vw, 260px) * 4 / 3)" } : undefined}
      >
        {!overlap && left ? <Portrait p={left} side="left" overlap={overlap} reduce={reduce} /> : null}

        {/* The type sits above the pictures in the overlap setting — that is
            the whole effect. `break-words` because a 64px line with a long
            word has nowhere to go on a 375px screen. */}
        <div className={overlap ? "relative z-10 w-full text-center" : "relative z-10 text-center"}>
          {lines.map((l, i) => (
            <motion.p
              key={i}
              className="z-h2 break-words"
              style={{ fontSize: "clamp(30px, 6.4vw, 76px)", fontWeight: 600, lineHeight: 1.12 }}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {l}
            </motion.p>
          ))}
        </div>

        {!overlap && right ? <Portrait p={right} side="right" overlap={overlap} reduce={reduce} /> : null}

        {overlap && left ? <Portrait p={left} side="left" overlap={overlap} reduce={reduce} /> : null}
        {overlap && right ? <Portrait p={right} side="right" overlap={overlap} reduce={reduce} /> : null}
      </div>

      {notes.length ? (
        <div className="relative z-20 mt-14 grid gap-8 sm:mt-20 sm:grid-cols-2">
          {notes.map((n, i) => (
            <p key={i} className={`z-body max-w-[34ch] text-[15px] ${i === 1 ? "sm:justify-self-end sm:text-right" : ""}`}>
              {n.text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
