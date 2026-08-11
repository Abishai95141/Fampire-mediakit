"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * The four intent lanes, animated on entry.
 *
 * Motion is doing a job here, not decorating: the rows arrive one after
 * another with the rule drawing ahead of the type, which reads as a list
 * being set rather than a block appearing. That is what makes the section
 * legible as four *choices* instead of four paragraphs.
 *
 * `whileInView` with `once` — it plays when the section arrives and never
 * again, so scrolling back up does not re-trigger a performance.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Lanes({
  lanes,
}: {
  lanes: readonly { href: string; label: string; detail: string }[];
}) {
  const reduceMotion = useReducedMotion();

  // The variants are always defined; reduced motion is handled by simply not
  // wiring `initial`/`whileInView`, so the elements render in their finished
  // state instead of running a degraded version of the animation.
  const row: Variants = {
    hidden: { opacity: 0, y: 26 },
    shown: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.85, ease: EASE, delay: i * 0.09 },
    }),
  };

  const rule: Variants = {
    hidden: { scaleX: 0 },
    shown: (i: number) => ({
      scaleX: 1,
      transition: { duration: 0.9, ease: EASE, delay: i * 0.09 },
    }),
  };

  return (
    <ul>
      {lanes.map((lane, i) => (
        <li key={lane.href} className="relative">
          <motion.span
            aria-hidden
            className="absolute inset-x-0 top-0 block h-px origin-left bg-fam-rule"
            custom={i}
            variants={rule}
            initial={reduceMotion ? undefined : "hidden"}
            whileInView={reduceMotion ? undefined : "shown"}
            viewport={{ once: true, amount: 0.4 }}
          />
          <motion.div
            custom={i}
            variants={row}
            initial={reduceMotion ? undefined : "hidden"}
            whileInView={reduceMotion ? undefined : "shown"}
            viewport={{ once: true, amount: 0.4 }}
          >
            <Link
              href={lane.href}
              className="group grid items-baseline gap-x-8 gap-y-2 py-8 sm:grid-cols-[3.5rem_minmax(0,18rem)_1fr_auto]"
            >
              <span className="fam-eyebrow-muted tabular-nums transition-colors duration-500 group-hover:text-fam-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="fam-display text-[2.1rem] leading-[1.08] sm:text-[2.7rem]">
                {lane.label}
              </span>
              <span className="max-w-lg text-[15px] leading-relaxed text-fam-body">
                {lane.detail}
              </span>
              <span
                aria-hidden
                className="hidden text-fam-faint transition-all duration-500 group-hover:translate-x-2 group-hover:text-fam-ink sm:block"
              >
                →
              </span>
            </Link>
          </motion.div>
        </li>
      ))}
      <li aria-hidden className="border-t border-fam-rule" />
    </ul>
  );
}
