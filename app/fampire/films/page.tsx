import type { Metadata } from "next";
import Link from "next/link";
import { ImageWell } from "@/components/fampire/Preview";
import {
  ENTRIES,
  FILM_AWARDS,
  FILMS,
  WHERE_TO_WATCH,
  previewForFilm,
} from "@/lib/fampire/catalog";

/**
 * The Films — a narrative lens, not a second catalog.
 *
 * Every film heading links into the Library pre-filtered to that title, so a
 * reader moves from the story to the assets without leaving the two-click
 * ceiling. The records are the same records.
 */

export const metadata: Metadata = {
  title: "Films",
  description:
    "Seven documentaries from Lolli Brands Entertainment — synopses, award counts, assets and where to watch.",
};

export const dynamic = "force-static";

/** Synopses as published by the client. Not rewritten, not embellished. */
const SYNOPSIS: Record<string, string> = {
  "Biohack Yourself":
    "A five-part documentary following Anthony and TereZa Lolli and their family into the world of biohacking after life-changing health challenges. More than 25 evidence-informed modalities and insight from over 40 physicians, scientists and inventors, including Dave Asprey and Ben Greenfield.",
  "The Guru":
    "George Farah, from child soldier to bodybuilding icon. He survives being shot, stage 4 cancer and more, with exclusive interviews from legendary bodybuilders including Kai Greene and Dexter Jackson.",
  "Skin Deep":
    "Alex Porro lost over 300 lbs from a heaviest weight of 480 lbs. He begins his next journey by removing 20 lbs of loose skin, and going through the grueling recovery.",
  "The Super Lollis":
    "TereZa and Anthony Lolli on their journey to transform themselves. After Anthony finally succeeded, TereZa followed — to show all mothers they can look better than ever, even after two children.",
  "From Fat Lolli to 6 Pack Lolli":
    "Obese his entire life, real estate mogul Anthony Lolli accepts his greatest challenge: 125 lbs in nine months, ending on a fitness competition stage. Through blood, sweat and tears, the ultimate transformation story.",
  "sHEALed":
    "A four-part saga on women's health — Becoming, Awakening, Rising and Protocols. From the earliest threshold of womanhood, through the gap between women's lived experience and the systems that under-researched it, to a practical guide for every stage of life.",
  "Bye Ol' Dentistry":
    "An experiential documentary exploring biological and holistic dentistry. Through real-time procedures, expert insight and patient journeys, it examines alternatives to conventional practice and the link between oral and overall health.",
  "The New Woo":
    "How practices once dismissed as woo are increasingly being examined, and in some cases supported, by modern science. Through expert insight and real-world experience, the film looks at the intersection of biohacking, spirituality and holistic health.",
};

export default function FilmsPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-32 pt-12 sm:px-10 sm:pt-16 lg:px-12">
      <h1 className="fam-display text-[3rem] leading-[1.06] sm:text-[4.5rem]">
        The Films
      </h1>
      <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.65] text-fam-body">
        {FILMS.length} titles, {FILM_AWARDS} documentary awards between them,
        distributed across eleven platforms. Each one links straight into the
        library filtered to its own assets.
      </p>

      <div className="mt-16 space-y-20 sm:space-y-28">
        {FILMS.map((f) => {
          const assets = ENTRIES.filter((e) => e.film === f.title);
          const watch = WHERE_TO_WATCH.filter((w) => w.film === f.title);
          const hero = previewForFilm(f.title);

          return (
            <article key={f.slug} className="fam-section-rule pt-10">
              <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <h2 className="fam-display text-[2.6rem] leading-[1.06] sm:text-[3.4rem]">
                      {f.title}
                    </h2>
                    <span className="fam-eyebrow-muted">
                      {f.year} ·{" "}
                      {f.awards > 0 ? `${f.awards} awards` : "In production"}
                    </span>
                  </div>

                  <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.7] text-fam-body">
                    {SYNOPSIS[f.title]}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                    <Link
                      href={`/fampire/library?film=${encodeURIComponent(f.title)}`}
                      className="fam-underline text-[14px] font-semibold text-fam-ink"
                    >
                      {assets.length} collection{assets.length === 1 ? "" : "s"} →
                    </Link>
                    {watch.length > 0 ? (
                      <span className="text-[14px] text-fam-muted">
                        Watch on{" "}
                        {watch.map((w, i) => (
                          <span key={w.url}>
                            {i > 0 ? ", " : ""}
                            <a
                              href={w.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="fam-underline font-medium text-fam-body hover:text-fam-ink"
                            >
                              {w.platform}
                            </a>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>

                <ImageWell
                  src={hero?.image ?? null}
                  alt={hero?.title ?? f.title}
                  label={f.title}
                  shape="wide"
                  width={880}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
