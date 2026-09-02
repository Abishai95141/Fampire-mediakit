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

  const Portrait = ({ p, side }: { p: SplitPortrait; side: "left" | "right" }) => (
    <motion.div
      className={[
        "pointer-events-none select-none",
        overlap ? "absolute top-1/2 -translate-y-1/2" : "relative",
        overlap ? (side === "left" ? "left-0" : "right-0") : "",
      ].join(" ")}
      style={{ width: overlap ? "clamp(120px, 19vw, 300px)" : "clamp(110px, 15vw, 230px)" }}
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

  return (
    <div className="relative">
      <div
        className={[
          "relative flex items-center",
          overlap ? "justify-center" : "justify-between gap-4 sm:gap-10",
        ].join(" ")}
      >
        {!overlap && left ? <Portrait p={left} side="left" /> : null}

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

        {!overlap && right ? <Portrait p={right} side="right" /> : null}

        {overlap && left ? <Portrait p={left} side="left" /> : null}
        {overlap && right ? <Portrait p={right} side="right" /> : null}
      </div>

      {notes.length ? (
        <div className="mt-14 grid gap-8 sm:mt-20 sm:grid-cols-2">
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
