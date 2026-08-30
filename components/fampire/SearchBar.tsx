"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The persistent search field. Rule 4 of the anti-abstraction rules: search
 * never disappears, and reaching it is zero interactions.
 *
 * On the Library it filters in place and rewrites the URL as you type, so any
 * result set you are looking at can be pasted into Slack and will reopen
 * exactly as you left it. Everywhere else it hands off to the Library.
 */
export default function SearchBar({
  placeholder = "Search the library",
  /** Library mode: push query changes into the URL instead of navigating. */
  live = false,
  autoFocusOnDesktop = false,
}: {
  placeholder?: string;
  live?: boolean;
  autoFocusOnDesktop?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocusOnDesktop) return;
    // Never steal focus on touch — it throws up the keyboard and shoves the
    // hero off screen, which is the opposite of "understands it in 60s".
    if (window.matchMedia("(min-width: 1024px)").matches && !("ontouchstart" in window)) {
      ref.current?.focus({ preventScroll: true });
    }
  }, [autoFocusOnDesktop]);

  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      /**
       * A new query starts at page one.
       *
       * Without this the stale `page` survives into the new result set, and a
       * query narrower than the page you were on renders NOTHING while the
       * header and every facet still report the correct count. Measured on
       * production: `?q=315` returned the one match, `?page=3&q=315` said
       * "1 of 549 collections" and drew zero cards.
       *
       * That is indistinguishable from "search is broken" — and it was
       * reported as exactly that, as the top finding of a client retrieval
       * test. The facet links already rebuild from scratch and so never had
       * this; only typing carried the old page forward.
       */
      next.delete("page");
      const qs = next.toString();
      // replace, not push — typing should not fill the back button with a
      // history entry per keystroke.
      router.replace(qs ? `/library?${qs}` : `/library`, { scroll: false });
    }, 140);
    return () => clearTimeout(t);
    // `params` identity changes on every navigation; including it would
    // re-fire the debounce on results arriving and fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, live]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (live) return;
    router.push(value ? `/library?q=${encodeURIComponent(value)}` : `/library`);
  }

  function clear() {
    setValue("");
    ref.current?.focus();
    if (!live) return;
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    // Clearing widens the set, so the old page is meaningless here too.
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `/library?${qs}` : `/library`, { scroll: false });
  }

  /**
   * A bordered field with a real button, rather than a big underlined input
   * with a decorative "↵".
   *
   * The old bar put an oversized placeholder, the typed query and a glyph on
   * one baseline with no boundary around any of them, and the glyph was
   * `pointer-events-none` — so the one thing that looked like a control was
   * the one thing you could not click. Reported as "confusing, too many
   * elements in the same place", and on the Library it sat directly above the
   * sort row with nothing separating them.
   *
   * The box gives search an edge of its own so it reads as one control, and
   * SEARCH is a real submit button. On the Library the field still filters as
   * you type; the button is there because a visible affordance is what tells
   * someone this is a search field at all, and pressing it is never wrong.
   */
  return (
    <form onSubmit={onSubmit} role="search" className="block">
      <div className="flex items-stretch border-2 border-fam-ink bg-fam-paper transition-shadow focus-within:shadow-[3px_3px_0_0_var(--fam-ink)]">
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search the FAMPIRE library"
          /**
           * Capped at 20px. The placeholder has to FIT: at 32px, "Search — a
           * person, a film, an event, a year" was clipped mid-word on a
           * 375px screen. Inside a box the type no longer has to be huge to
           * carry the element, so it can be a size that fits.
           */
          className="w-full min-w-0 flex-1 overflow-hidden text-ellipsis bg-transparent px-4 py-3.5 text-[15px] text-fam-ink outline-none placeholder:text-fam-muted sm:px-5 sm:text-[17px] lg:text-[20px]
                     [&::-webkit-search-cancel-button]:appearance-none"
        />

        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="shrink-0 px-3 text-[18px] leading-none text-fam-muted transition-colors hover:text-fam-ink"
          >
            ×
          </button>
        ) : null}

        <button
          type="submit"
          className="fam-meta shrink-0 border-l-2 border-fam-ink bg-fam-ink px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-fam-paper transition-opacity hover:opacity-82 sm:px-6"
        >
          Search
        </button>
      </div>
    </form>
  );
}
