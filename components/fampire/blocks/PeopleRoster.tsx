"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The roster: a list of names on the right, the selected person's portrait and
 * bio on the left.
 *
 * This is the approved layout's "Guided by Practitioners" section. It suits
 * FAMPIRE better than it suited the template, because the roles here are real
 * and load-bearing — Anthony is a founder AND a director AND an author, and a
 * portrait grid cannot say that. The list shows the role beside every name and
 * the panel carries the bio the client already wrote in the CMS.
 *
 * Hover OR keyboard focus selects, and the row is a real link, so the section
 * is operable without a mouse rather than being a hover-only flourish.
 */

export type RosterPerson = {
  slug: string;
  name: string;
  role?: string | null;
  bio?: string | null;
  src: string | null;
};

export default function PeopleRoster({ people }: { people: RosterPerson[] }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  if (!people.length) return null;
  const p = people[Math.min(active, people.length - 1)]!;

  return (
    <div className="z-layout grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16">
      {/* The panel. Order last on mobile so the names — the actual content —
          come first on a phone rather than a 4:3 portrait pushing them down. */}
      <div className="order-last lg:order-first">
        <motion.div
          key={p.slug}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {p.bio ? (
            <p className="z-body mb-5 max-w-[42ch] rounded-[14px] bg-[color:var(--z-panel,#f4f2ee)] p-5 text-[14px] leading-[1.55]">
              {p.bio}
            </p>
          ) : null}

          <div className="max-w-[340px]">
            {p.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="z-portrait" src={p.src} alt={`${p.name}, portrait`} />
            ) : (
              <div className="z-portrait flex items-end p-4">
                <span className="z-label">{p.name}</span>
              </div>
            )}
          </div>

          <Link
            href={`/library?subject=${encodeURIComponent(p.slug)}`}
            className="mt-6 inline-flex items-center gap-3 rounded-[10px] px-6 py-4 text-[14px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--z-ink)", color: "var(--z-ground)" }}
          >
            See {p.name.split(" ")[0]}&rsquo;s collections
            <span aria-hidden>→</span>
          </Link>
        </motion.div>
      </div>

      {/* The list. 88px pitch and a 20px/500 name, measured off the approved
          layout; the selected row is a full-width black bar. */}
      <ul className="flex flex-col">
        {people.map((q, i) => {
          const on = i === (active < people.length ? active : 0);
          return (
            <li key={q.slug}>
              <Link
                href={`/library?subject=${encodeURIComponent(q.slug)}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 rounded-[8px] px-4 py-6 transition-colors sm:px-6"
                style={{
                  background: on ? "var(--z-ink)" : "transparent",
                  color: on ? "var(--z-ground)" : "var(--z-ink)",
                }}
              >
                <span className="text-[clamp(17px,2vw,20px)] font-medium tracking-[-0.01em]">
                  {q.name}
                </span>
                {q.role ? (
                  <span
                    className="text-[12px] uppercase tracking-[0.12em]"
                    style={{ opacity: on ? 0.85 : 0.45 }}
                  >
                    {q.role}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
