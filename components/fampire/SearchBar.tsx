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

  return (
    <form onSubmit={onSubmit} className="group relative block">
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search the FAMPIRE library"
        className="fam-display-sm w-full border-b-2 border-fam-ink/30 bg-transparent pb-4 pr-10 text-[22px] text-fam-ink outline-none transition-colors placeholder:text-fam-muted focus:border-fam-ink sm:text-[28px] lg:text-[32px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-5 right-0 text-fam-muted transition-colors group-focus-within:text-fam-ink"
      >
        ↵
      </span>
    </form>
  );
}
