"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Preloader from "@/components/fampire/Preloader";

/**
 * The FAMPIRE chrome: a rule-bounded top bar, the page, a footer.
 *
 * No sidebar, no dashboard furniture. HNN is a working portal with a rail of
 * 116 pages; FAMPIRE is a press room, and a press room is a document, so its
 * navigation is a masthead. This is the single biggest structural difference
 * between the two products and it is intentional.
 */

const NAV = [
  { href: "/fampire/library", label: "The Library" },
  { href: "/fampire/films", label: "Films" },
  { href: "/fampire/people", label: "People" },
  { href: "/fampire/press", label: "Press" },
];

export default function Shell({
  children,
  total,
  signedIn,
}: {
  children: React.ReactNode;
  total: number;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  // The curtain belongs on the front door only. Someone who arrives on a deep
  // link from a Slack message wants the asset, not an overture — and a
  // preloader on every route is the single fastest way to make a fast site
  // feel slow.
  const withPreloader = pathname === "/fampire";
  const [revealed, setRevealed] = useState(!withPreloader);
  const [scrolled, setScrolled] = useState(false);

  // The masthead is always white and always opaque, on every route including
  // the video hero. A transparent bar over footage is unreadable by
  // definition: the picture underneath it keeps changing, so no single text
  // colour stays legible. It only gains its bottom rule once scrolled, so a
  // page at rest has one less line in it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setRevealed(true);
  };

  return (
    <>
      {withPreloader ? (
        <Preloader total={total} onReveal={() => setRevealed(true)} onDone={finish} />
      ) : null}

      <div
        className={`transition-opacity duration-700 ${revealed ? "opacity-100" : "opacity-0"}`}
      >
        <header
          className={`sticky inset-x-0 top-0 z-50 border-b bg-fam-paper transition-colors duration-300 ${
            scrolled ? "border-fam-rule" : "border-transparent"
          }`}
        >
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-6 py-5 sm:px-10 lg:px-12">
            <Link href="/fampire" className="group flex items-baseline gap-3">
              <span className="fam-display-sm text-[20px] leading-[1.3] tracking-[-0.02em]">
                FAMPIRE
              </span>
              <span className="fam-meta hidden text-[10px] font-medium uppercase tracking-[0.18em] text-fam-muted sm:inline">
                Media Center
              </span>
            </Link>

            <nav className="flex items-center gap-6 sm:gap-9">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`fam-underline hidden text-[13.5px] font-semibold tracking-[0.005em] transition-colors sm:inline ${
                      active ? "text-fam-ink" : "text-fam-muted hover:text-fam-ink"
                    }`}
                    style={active ? { backgroundSize: "100% 1px" } : undefined}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <Link
                href="/fampire/library"
                className="text-[13.5px] font-semibold text-fam-muted transition-colors hover:text-fam-ink sm:hidden"
              >
                Search
              </Link>
              {signedIn ? (
                <span className="fam-meta hidden items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-fam-muted md:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-fam-ink" aria-hidden />
                  Signed in
                </span>
              ) : (
                <Link
                  href="/fampire/login"
                  className="fam-meta border border-fam-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-fam-ink transition-colors hover:bg-fam-ink hover:text-white"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="bg-fam-ink text-white">
          <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 lg:px-12">
            <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="fam-display text-3xl leading-[1.05] text-white sm:text-4xl">
                  FAMPIRE
                </p>
                <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-white/70">
                  The umbrella above the worlds of The Lolli Family Institution.
                  A catalog over the archive, not a copy of it — every entry
                  points at the original.
                </p>
              </div>

              <div>
                <p className="fam-eyebrow text-white/55">Center</p>
                <ul className="mt-4 space-y-2.5">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className="fam-underline text-[14px] font-medium text-white/80 hover:text-white"
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="fam-eyebrow text-white/55">Ecosystem</p>
                <ul className="mt-4 space-y-2.5">
                  <li>
                    <a
                      href="https://www.biohackyourself.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fam-underline text-[14px] font-medium text-white/80 hover:text-white"
                    >
                      Biohack Yourself ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.lollibrands.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fam-underline text-[14px] font-medium text-white/80 hover:text-white"
                    >
                      Lolli Brands Entertainment ↗
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="fam-meta mt-16 flex flex-col justify-between gap-3 border-t border-white/20 pt-6 text-[11px] uppercase tracking-[0.14em] text-white/50 sm:flex-row">
              <p>FAMPIRE® · Biohack Yourself® · HNN® · World&rsquo;s Top Dentist™</p>
              <p>{total} collections indexed · assets remain with their owners</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
