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

/**
 * Navigation and footer come from the CMS.
 *
 * These were a constant here, which meant the client could not add, rename or
 * reorder a single nav item without a developer — the first thing anyone asks
 * to change. Edited at /admin → Settings → Navigation & Footer.
 */
type NavItem = { label: string; href: string };

export default function Shell({
  children,
  total,
  signedIn,
  nav,
  footer,
}: {
  nav: NavItem[];
  footer?: {
    blurb?: string | null;
    links?: NavItem[] | null;
    trademarkNote?: string | null;
  };
  children: React.ReactNode;
  total: number;
  /** Required on purpose. Defaulting this to "fampire" emitted links to a
   *  route that does not exist — FAMPIRE is the umbrella above the eight
   *  worlds (§10), not one of them. */
  signedIn: boolean;
}) {
  const pathname = usePathname();
  /**
   * The mobile menu.
   *
   * Every nav link carried `hidden sm:inline`, so below 640px the masthead
   * offered a bare "Search" link and nothing else — the Library, Films, People
   * and Press were unreachable on a phone, which is most of a press room's
   * traffic. Closed on navigation so tapping a link does not leave the drawer
   * covering the page you asked for.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  // The curtain belongs on the front door only. Someone who arrives on a deep
  // link from a Slack message wants the asset, not an overture — and a
  // preloader on every route is the single fastest way to make a fast site
  // feel slow.
  const withPreloader = pathname === "/";
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
            <Link href={"/"} className="group flex items-baseline gap-3">
              <span className="fam-display-sm text-[20px] leading-[1.3] tracking-[-0.02em]">
                FAMPIRE
              </span>
              <span className="fam-meta hidden text-[10px] font-medium uppercase tracking-[0.18em] text-fam-muted sm:inline">
                Media Center
              </span>
            </Link>

            <nav className="flex items-center gap-6 sm:gap-9">
              {nav.map((n) => {
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
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="fam-mobile-nav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="-mr-1 flex h-9 w-9 items-center justify-center text-fam-ink sm:hidden"
              >
                {/* Two rules that cross into an X. Cheaper than an icon font
                    and it animates, so the button reads as a toggle. */}
                <span className="relative block h-4 w-5" aria-hidden>
                  <span
                    className={`absolute left-0 block h-[2px] w-5 bg-fam-ink transition-transform duration-200 ${
                      menuOpen ? "top-[7px] rotate-45" : "top-[3px]"
                    }`}
                  />
                  <span
                    className={`absolute left-0 block h-[2px] w-5 bg-fam-ink transition-transform duration-200 ${
                      menuOpen ? "top-[7px] -rotate-45" : "top-[11px]"
                    }`}
                  />
                </span>
              </button>
              {signedIn ? (
                <span className="fam-meta hidden items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-fam-muted md:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-fam-ink" aria-hidden />
                  Signed in
                </span>
              ) : (
                <Link
                  href={`/login`}
                  className="fam-meta border border-fam-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-fam-ink transition-colors hover:bg-fam-ink hover:text-white"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>

          {/* The drawer. Rendered only when open so its links are not in the
              tab order of a page that is not showing them. */}
          {menuOpen ? (
            <div id="fam-mobile-nav" className="border-t border-fam-rule bg-fam-paper sm:hidden">
              <nav className="mx-auto flex max-w-[1320px] flex-col px-6 py-2">
                {nav.map((n) => {
                  const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMenuOpen(false)}
                      className={`border-b border-fam-rule py-4 text-[16px] font-semibold last:border-b-0 ${
                        active ? "text-fam-ink" : "text-fam-body"
                      }`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </header>

        <main className="pb-16 sm:pb-24">{children}</main>

        <footer className="bg-fam-ink text-white">
          <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 lg:px-12">
            <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="fam-display text-3xl leading-[1.05] text-white sm:text-4xl">
                  FAMPIRE
                </p>
                {/* Editable: /admin -> Settings -> Navigation & Footer -> Footer blurb.
                    The written fallback keeps a fresh database from rendering an
                    empty footer. */}
                <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-white/70">
                  {footer?.blurb ??
                    "The umbrella above the worlds of The Lolli Family Institution. A catalog over the archive, not a copy of it — every entry points at the original."}
                </p>
                {footer?.links?.length ? (
                  <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                    {footer.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="fam-meta text-[11px] uppercase tracking-[0.12em] text-white/70 hover:text-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {footer?.trademarkNote ? (
                  <p className="mt-6 text-[11px] leading-relaxed text-white/40">
                    {footer.trademarkNote}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="fam-eyebrow text-white/55">Center</p>
                <ul className="mt-4 space-y-2.5">
                  {nav.map((n) => (
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
