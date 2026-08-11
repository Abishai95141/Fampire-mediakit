import Link from "next/link";
import HeroVideo from "@/components/fampire/HeroVideo";
import Preview, { ImageWell } from "@/components/fampire/Preview";
import SearchBar from "@/components/fampire/SearchBar";
import Lanes from "@/components/fampire/Lanes";
import Section from "@/components/fampire/Section";
import {
  ENTRIES,
  FILM_AWARDS,
  FILMS,
  LANES,
  PUBLIC_ENTRIES,
  SUBJECT_LABEL,
  WHERE_TO_WATCH,
  previewForFilm,
  previewsForSubjects,
  stats,
} from "@/lib/fampire/catalog";
import { HERO, heroSkeleton } from "@/lib/fampire/media";

/**
 * The front door.
 *
 * Success is measured in seconds: a booker on a phone should understand the
 * institution and reach a route in under a minute, an editor should be one
 * search away from b-roll. So the hero carries the headline AND the moving
 * image together — the film is the argument, not an illustration underneath
 * it — and search sits immediately below, above the fold on a laptop.
 *
 * Public by design: no login, no email capture, no gate in front of anything
 * on this page. The proxy allowlists it (see proxy.ts).
 */

export const dynamic = "force-static";

const s = stats();

const PEOPLE = [
  {
    key: "anthony",
    role: "Founder · Director · Author",
    line: "Real estate mogul and best-selling author of The Heart of the Deal. At 315 pounds and facing major health decline, he documented his 125-pound transformation on camera — the film that became a global phenomenon on Prime Video and Apple TV.",
  },
  {
    key: "tereza",
    role: "Editor-in-Chief · Director · Recording Artist",
    line: "Armenian-born actress, recording artist and mother who turned postpartum hormonal collapse into a wellness revolution — two bikini world titles, and the films The Super Lollis, Skin Deep and sHEALed.",
  },
  {
    key: "love",
    role: "Correspondent · Director · Producer",
    line: "Reports on health news, conducts on-camera interviews at events, and invests in real estate. Credited as a director and producer.",
  },
  {
    key: "legend",
    role: "Correspondent · Director · Producer",
    line: "Reports on health news and builds media projects alongside his sister. Credited as a director and producer.",
  },
] as const;

const MAGAZINE = ENTRIES.filter((e) => e.kind === "magazine" && e.preview);
/** Resolved once, for the row as a whole, so no two people share a frame. */
const PERSON_SHOTS = previewsForSubjects(PEOPLE.map((p) => p.key));
const EVENT_CARDS = ENTRIES.filter((e) => e.event && e.image).slice(0, 6);

export default function FampireHome() {
  return (
    <>
      {/* ── Hero: video major, information beside it ──────────────────
           The film holds roughly two thirds of the screen and the reading
           material sits next to it on white, not on top of it. Type over
           moving footage is unreadable at any scrim strength — the picture
           keeps changing underneath it — so the two never overlap. The
           masthead stays white and opaque above both for the same reason. */}
      <section className="grid border-b border-fam-rule lg:grid-cols-[minmax(0,1fr)_18.5rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Video panel, 16:9 — the film's own shape, so the whole frame is
            visible with nothing cropped off the sides. It sets the height of
            the row; the column beside it distributes into whatever that is. */}
        <div className="relative aspect-video w-full overflow-hidden bg-fam-ink lg:border-r lg:border-fam-rule">
          <HeroVideo
            videoId={HERO.videoId}
            poster={heroSkeleton()}
            title={HERO.title}
            startAt={HERO.startAt}
          />
        </div>

        {/* Information column — white, vertical, one item at a time. Kept
            narrow on purpose: it is a caption beside the film, not a second
            hero competing with it for width. */}
        <div className="flex flex-col justify-between gap-8 px-6 py-9 sm:px-10 lg:px-7 lg:py-8 xl:px-9">
          <div>
            <p className="fam-eyebrow">The Lolli Family Institution</p>
            <p className="mt-4 text-[14px] leading-[1.6] text-fam-body">
              The press room for Lolli Brands Entertainment and Biohack Yourself
              Media — films, people, events and the full media library, linked
              straight to where each collection lives.
            </p>
          </div>

          <dl className="divide-y divide-fam-rule border-y border-fam-rule">
            {(
              [
                [s.total, "collections indexed"],
                [FILMS.length, "documentary films"],
                [s.events, "events covered"],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-3">
                <dt className="fam-display text-[1.9rem] leading-[1.06] tabular-nums">
                  {n}
                </dt>
                <dd className="fam-meta text-right text-[10px] uppercase tracking-[0.14em] text-fam-muted">
                  {label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col">
            <Link href="/fampire/library" className="fam-btn justify-center !px-5 !text-[11px]">
              Open the library <span aria-hidden>→</span>
            </Link>
            <Link href="/fampire/press" className="fam-btn-ghost justify-center !px-5 !text-[11px]">
              Press log
            </Link>
          </div>
        </div>
      </section>

      {/* ── Search. Hairline-bounded, not a heavy band: it belongs to the
             hero above it rather than announcing itself as a section. ─── */}
      <section className="border-b border-fam-rule bg-fam-paper">
        <div className="mx-auto max-w-[1320px] px-6 py-9 sm:px-10 sm:py-11 lg:px-12">
          <SearchBar
            autoFocusOnDesktop
            placeholder="Search — a person, a film, an event, a year"
          />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="fam-eyebrow-muted">Try</span>
            {["MAHA Ball", "trailer", "headshots", "2025", "TereZa"].map((t) => (
              <Link
                key={t}
                href={`/fampire/library?q=${encodeURIComponent(t)}`}
                className="fam-underline text-[14px] font-medium text-fam-body hover:text-fam-ink"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The four intent lanes ────────────────────────────────────── */}
      <Section n="01" title="What are you here to do">
        <Lanes lanes={LANES} />
      </Section>

      {/* ── The institution — inverted, so the page has a spine ──────── */}
      <section className="mt-24 bg-fam-ink text-white sm:mt-32">
        <div className="mx-auto grid max-w-[1320px] gap-x-16 gap-y-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              02 — The institution
            </p>
            <h2 className="fam-display mt-6 text-[2.6rem] leading-[1.08] text-white sm:text-[3.4rem]">
              FAMPIRE is the crown above the worlds — not a company.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-[17px] leading-[1.68] text-white/90">
              Anthony and TereZa Lolli are the couple behind Biohack Yourself
              Media — an independent health and wellness platform reaching
              millions with expert-driven journalism and award-winning
              storytelling. Together they have produced more than a dozen
              documentaries, and they are raising two young trailblazers, Love
              and Legend Lolli, who are already reporting on health news before
              the age of ten.
            </p>
            <p className="mt-6 text-[15px] leading-[1.7] text-white/65">
              In 2024 their influence reached national scale when Biohack
              Yourself Media was selected as the exclusive health press at the
              MAHA Inaugural Ball — the Waldorf Astoria, Washington D.C., 20
              January 2025.
            </p>
            <Link
              href="/fampire/library?event=MAHA+Inaugural+Ball"
              className="mt-9 inline-flex items-center gap-2.5 border border-white/45 px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-fam-ink"
            >
              See the MAHA coverage <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── The films ────────────────────────────────────────────────── */}
      <Section
        n="03"
        title="The films"
        aside={`${FILMS.length} titles · ${FILM_AWARDS} documentary awards · streaming on eleven platforms`}
        href="/fampire/films"
        hrefLabel="All films"
      >
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FILMS.map((f) => {
            const art = previewForFilm(f.title);
            return (
              <li key={f.slug}>
                <Link
                  href={`/fampire/library?film=${encodeURIComponent(f.title)}`}
                  className="group block"
                >
                  <ImageWell
                    src={art?.image ?? null}
                    alt={f.title}
                    label={f.title}
                    shape="tall"
                    width={700}
                  />
                  <h3 className="fam-display-sm mt-4 text-[19px] leading-snug">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] text-fam-muted">{f.note}</p>
                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-fam-ink">
                    {f.awards > 0 ? `${f.awards} awards` : "In production"} · {f.year}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── The people ───────────────────────────────────────────────── */}
      <Section
        n="04"
        title="The people"
        href="/fampire/people"
        hrefLabel="Bios and the spoken introduction"
      >
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PEOPLE.map((p) => (
              <li key={p.key}>
                <Link href={`/fampire/library?subject=${p.key}`} className="group block">
                  <ImageWell
                    src={PERSON_SHOTS[p.key] ?? null}
                    alt={SUBJECT_LABEL[p.key]}
                    label={SUBJECT_LABEL[p.key]}
                    shape="tall"
                    width={700}
                  />
                  <h3 className="fam-display-sm mt-4 text-[19px] leading-snug">
                    {SUBJECT_LABEL[p.key]}
                  </h3>
                  <p className="fam-eyebrow-muted mt-1.5">{p.role}</p>
                  <p className="mt-3 text-[14px] leading-[1.65] text-fam-body">
                    {p.line}
                  </p>
                </Link>
              </li>
          ))}
        </ul>
      </Section>

      {/* ── The room ─────────────────────────────────────────────────── */}
      {EVENT_CARDS.length > 0 ? (
        <Section
          n="05"
          title="The room"
          aside={`${s.events} events covered across 2024–2026`}
          href="/fampire/library?kind=event+photography"
          hrefLabel="All event photography"
        >
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_CARDS.map((e) => (
              <li key={e.id}>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <Preview entry={e} shape="wide" width={900} />
                  <p className="fam-eyebrow-muted mt-4">
                    {e.year} · {e.kind}
                  </p>
                  <h3 className="fam-display-sm mt-2 text-[19px] leading-snug">
                    {e.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.65] text-fam-body">
                    {e.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── The magazine ─────────────────────────────────────────────── */}
      <section className="mt-20 border-y-2 border-fam-ink bg-fam-paper sm:mt-28">
        <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 sm:py-20 lg:px-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="fam-eyebrow">06 — The magazine</h2>
            <p className="text-[13px] font-medium text-fam-muted">
              Eight issues · print in 4,300+ US and Canadian retail locations
            </p>
          </div>
          <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {MAGAZINE.map((m) => (
              <li key={m.id} className="border-t border-fam-rule pt-6">
                <h3 className="fam-display-sm text-[18px] leading-snug">
                  {m.title.replace("Biohack Yourself Magazine — ", "")}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-fam-body">
                  {m.description}
                </p>
                <div className="mt-4 flex gap-5">
                  <a
                    href={m.preview!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fam-underline text-[13px] font-semibold text-fam-ink"
                  >
                    Read the issue ↗
                  </a>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fam-underline text-[13px] text-fam-muted hover:text-fam-ink"
                  >
                    Assets ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Where to watch ───────────────────────────────────────────── */}
      <Section
        n="07"
        title="Where to watch"
        aside={`${WHERE_TO_WATCH.filter((w) => w.free).length} of ${s.watch} are free to stream`}
      >
        <div className="grid gap-x-14 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {FILMS.map((f) => {
            const links = WHERE_TO_WATCH.filter((w) => w.film === f.title);
            if (!links.length) return null;
            return (
              <div key={f.slug} className="border-t border-fam-rule pt-5">
                <h3 className="fam-display-sm text-[17px]">{f.title}</h3>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {links.map((w) => (
                    <li key={w.url}>
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fam-underline text-[13px] font-medium text-fam-body hover:text-fam-ink"
                      >
                        {w.platform}
                        {w.free ? <span className="text-fam-faint"> · free</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-14 max-w-2xl border-t border-fam-rule pt-6 text-[13px] leading-relaxed text-fam-muted">
          {PUBLIC_ENTRIES.length} of {s.total} collections are open to everyone,
          no account required. The remainder are password-gated at source or
          held back pending written sign-off, and need a FAMPIRE sign-in.
        </p>
      </Section>
    </>
  );
}
