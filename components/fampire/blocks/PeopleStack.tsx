"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import ItemControls from "@/components/fampire/ItemControls";
import type { RosterPerson } from "@/components/fampire/blocks/PeopleRoster";

/**
 * The people as the approved layout's card stack: heading held on the left,
 * and on the right a portrait with a dashed, numbered card lying across it.
 *
 * The template used this to stack four assertions about the reader. Here each
 * card is a person, which is a better use of it — the portrait behind is who
 * it is, the card in front is what the CMS says about them, and the label in
 * the card's foot is the role they actually hold. Nothing in it is written
 * here; name, role and bio all come from Who & What → People.
 *
 * The heading lives inside this component rather than above it because the
 * layout is two-column: a section head sitting on top would leave the left
 * column empty for the whole scroll.
 */
export default function PeopleStack({
  heading,
  intro,
  people,
  rail,
  signedIn = false,
  pageId,
  blockIndex,
}: {
  heading?: string | null;
  intro?: string | null;
  people: RosterPerson[];
  rail?: string | null;
  signedIn?: boolean;
  pageId?: number | string;
  blockIndex?: number;
}) {
  const reduce = useReducedMotion();
  if (!people.length) return null;

  return (
    <div className="z-wrap grid gap-12 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)] lg:gap-20">
      {/* Sticky, so the heading holds while the cards run past it — which is
          what makes the right column read as a stack rather than a list. */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        {heading ? <h2 className="z-h2">{heading}</h2> : null}
        {intro ? <p className="z-body mt-6 max-w-[46ch] text-[15px]">{intro}</p> : null}
        {rail ? <p className="z-label mt-14 hidden lg:block">{rail}</p> : null}
      </div>

      <div className="flex flex-col gap-16 sm:gap-24">
        {people.map((p, i) => (
          <motion.article
            key={p.slug}
            className="fam-item relative"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <ItemControls
              signedIn={signedIn}
              pageId={pageId}
              blockIndex={blockIndex}
              collection="people"
              id={p.id}
              label={p.name}
            />

            {/* The portrait, offset right and up so the card can lie across
                its lower-left corner exactly as in the approved layout. */}
            <div className="ml-auto w-[76%] sm:w-[68%]">
              {p.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.src}
                  alt={`${p.name}, portrait`}
                  className="w-full object-cover"
                  style={{ aspectRatio: "4 / 5", borderRadius: "6px 44px 6px 6px" }}
                />
              ) : (
                <div
                  className="w-full bg-[#2a2a2a]"
                  style={{ aspectRatio: "4 / 5", borderRadius: "6px 44px 6px 6px" }}
                />
              )}
            </div>

            <motion.div
              className="relative -mt-[42%] w-[82%] sm:-mt-[34%] sm:w-[72%]"
              initial={reduce ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={p.href ?? `/library?subject=${encodeURIComponent(p.slug)}`}
                className="block rounded-[34px] p-2 transition-transform duration-500 hover:-translate-y-1"
                style={{ background: "var(--z-panel, #f4f2ee)" }}
              >
                {/* The dashed inner rule is the template's device — a card that
                    reads as a specimen slip rather than a tile. */}
                <div
                  className="relative flex min-h-[300px] flex-col rounded-[28px] p-7 sm:min-h-[360px] sm:p-9"
                  style={{ border: "1px dashed rgba(18,18,18,.32)", color: "#121212" }}
                >
                  <span
                    className="absolute right-7 top-6 text-[12px] tracking-[0.1em] sm:right-9"
                    style={{ fontFamily: "ui-monospace, monospace", opacity: 0.45 }}
                  >
                    {String(i + 1).padStart(3, "0")}
                  </span>

                  <div className="flex flex-1 flex-col justify-center py-6 text-center">
                    <p
                      className="font-medium"
                      style={{ fontSize: "clamp(20px,2.4vw,29px)", letterSpacing: "-0.02em", lineHeight: 1.25 }}
                    >
                      {p.name}
                    </p>
                    {p.bio ? (
                      <p
                        className="mx-auto mt-4 max-w-[46ch] text-[14px] leading-[1.6]"
                        style={{ color: "#4c4c4c" }}
                      >
                        {p.bio}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className="text-[12px] tracking-[0.06em]"
                    style={{ fontFamily: "ui-monospace, monospace", opacity: 0.55 }}
                  >
                    {p.role ?? "Family"}
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
