import type { Metadata } from "next";
import Link from "next/link";
import { ImageWell } from "@/components/fampire/Preview";
import {
  PUBLIC_ENTRIES,
  SUBJECT_LABEL,
  previewsForSubjects,
} from "@/lib/fampire/catalog";

/**
 * The People — bios, the collections that feature each person, and the
 * spoken introduction a booker or MC actually needs.
 *
 * The introduction below is the client's own approved podcast intro, kept
 * verbatim and made copyable, because "an MC finds, copies and prints a :30
 * introduction in under 30 seconds" is one of the acceptance criteria.
 */

export const metadata: Metadata = {
  title: "People",
  description:
    "Anthony Lolli, TereZa Hakobyan-Lolli, Love Lolli and Legend Lolli — bios, headshots and the approved on-air introduction.",
};

export const dynamic = "force-static";

const PEOPLE = [
  {
    key: "anthony",
    role: "Founder · Director · Author",
    bio: "Anthony Lolli is a real estate mogul and the best-selling author of The Heart of the Deal, who built a multimillion-dollar empire from scratch. At 315 pounds and facing major health decline, he made the radical decision to document his 125-pound transformation on camera — launching the documentary From Fat Lolli to 6 Pack Lolli, which became a global phenomenon on Prime Video and Apple TV.",
  },
  {
    key: "tereza",
    role: "Editor-in-Chief · Director · Recording Artist",
    bio: "TereZa Hakobyan-Lolli is an Armenian-born actress, recording artist, mother and editor-in-chief who turned postpartum hormonal collapse into a wellness revolution — winning two bikini world titles and documenting it all through films including The Super Lollis, Skin Deep and sHEALed.",
  },
  {
    key: "love",
    role: "Correspondent · Director · Producer",
    bio: "Love Lolli reports on health news, conducts on-camera interviews at events, and invests in real estate — all before the age of ten. Credited as a director and producer.",
  },
  {
    key: "legend",
    role: "Correspondent · Director · Producer",
    bio: "Legend Lolli reports on health news and builds media projects alongside his sister. Credited as a director and producer.",
  },
] as const;

/** The client's approved introduction, verbatim. */
const INTRO_PARAGRAPHS = [
  "Today's guests are a couple who didn't just survive the system — they rebuilt it.",
  "Anthony and TereZa Lolli are the power couple behind Biohack Yourself Media — one of the fastest-growing independent health and wellness news platforms in the world — reaching millions with expert-driven journalism, science-backed content, and award-winning storytelling.",
  "Together, they've co-founded Lolli Brands Entertainment, producing more than a dozen acclaimed health and transformation documentaries. And they're raising two young trailblazers, Love and Legend Lolli, who are already reporting on health news, building media projects, and investing in real estate — all before age 10.",
  "They're not just content creators — they're immersive documentarians, performance marketers, and media entrepreneurs turning pain into purpose, and purpose into platforms.",
  "Please welcome Anthony and TereZa Lolli.",
];

/** Resolved for the page as a whole, so the siblings never share a frame. */
const SHOTS = previewsForSubjects(PEOPLE.map((p) => p.key));

export default function PeoplePage() {
  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-32 pt-12 sm:px-10 sm:pt-16 lg:px-12">
      <h1 className="fam-display text-[3rem] leading-[1.06] sm:text-[4.5rem]">
        The People
      </h1>

      <div className="mt-16 space-y-16">
        {PEOPLE.map((p) => {
          // Public count: this page is static and ungated, so quoting a number that
          // includes held-back collections would promise more than the link delivers.
          const collections = PUBLIC_ENTRIES.filter((e) => e.subjects.includes(p.key));

          return (
            <article
              key={p.key}
              className="fam-section-rule grid gap-x-14 gap-y-7 pt-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,20rem)_1fr]"
            >
              <ImageWell
                src={SHOTS[p.key] ?? null}
                alt={SUBJECT_LABEL[p.key]}
                label={SUBJECT_LABEL[p.key]}
                shape="tall"
                width={700}
              />
              <div>
                <h2 className="fam-display text-[2.4rem] leading-[1.06]">
                  {SUBJECT_LABEL[p.key]}
                </h2>
                <p className="fam-eyebrow-muted mt-3">{p.role}</p>
                <Link
                  href={`/fampire/library?subject=${p.key}`}
                  className="fam-underline mt-5 inline-block text-[14px] font-semibold text-fam-ink"
                >
                  {collections.length} collection
                  {collections.length === 1 ? "" : "s"} →
                </Link>
              </div>
              <div className="max-w-2xl">
                <p className="text-[16.5px] leading-[1.72] text-fam-body">{p.bio}</p>
              </div>
            </article>
          );
        })}
      </div>

      <section className="fam-section-rule mt-28 pt-12">
        <h2 className="fam-eyebrow">The introduction — read this aloud</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-fam-muted">
          Approved by the family. Roughly thirty seconds at broadcast pace.
        </p>
        <div className="mt-8 max-w-3xl space-y-5 border-l-2 border-fam-ink pl-6 sm:pl-10">
          {INTRO_PARAGRAPHS.map((para, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "fam-display-sm text-[22px] leading-[1.45]"
                  : "text-[16.5px] leading-[1.72] text-fam-body"
              }
            >
              {para}
            </p>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-fam-muted">
          TereZa is always spelled with a capital Z — in copy, in captions, in
          lower thirds and in file names.
        </p>
      </section>
    </div>
  );
}
