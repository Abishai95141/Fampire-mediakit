import { PLATFORM_LABEL, type Platform } from "@/lib/fampire/catalog";

/**
 * "Open in Google Drive" — the way out of the site to the material itself.
 *
 * One component, used by both the card and the collection page, because those
 * two had drifted already: the card rendered plain grey text and the detail
 * page a differently-sized rounded box, so the most important control on the
 * product looked like two unrelated things.
 *
 * It renders an `<a>` when given an href and a `<span>` when not. That is not
 * a convenience — on a card the whole article is already one `<Link>`, and an
 * anchor nested inside an anchor is invalid HTML that browsers silently
 * discard, taking one of the two links with it. The span keeps the affordance
 * without the broken markup; `.fam-source`'s hover state is driven from the
 * card's `group` for exactly that case.
 */

/** The Google Drive mark, in its own colours. A logo is a logo. */
function DriveMark() {
  return (
    <svg viewBox="0 0 87.3 78" width="13" height="12" aria-hidden focusable="false">
      <path
        fill="#0066da"
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
      />
      <path
        fill="#00ac47"
        d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"
      />
      <path
        fill="#ea4335"
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z"
      />
      <path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" />
      <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
      <path
        fill="#ffba00"
        d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
      />
    </svg>
  );
}

/** Everything that is not Drive: a neutral outbound mark in the site's ink. */
function OutboundMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M14 3h7v7M21 3l-9.5 9.5M19 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5" />
    </svg>
  );
}

export default function SourceLink({
  platform,
  href,
  className = "",
}: {
  platform: Platform;
  /** Omit on a card, where an outer `<Link>` already owns the click. */
  href?: string;
  className?: string;
}) {
  // PLATFORM_LABEL maps `unknown` to an em dash, which reads as "Open in —".
  const name =
    platform === "unknown" ? "storage" : (PLATFORM_LABEL[platform] ?? "storage");

  const inner = (
    <>
      {platform === "drive" ? <DriveMark /> : <OutboundMark />}
      Open in {name}
      <span aria-hidden>↗</span>
    </>
  );

  const cls = `fam-source ${className}`.trim();

  if (!href) return <span className={cls}>{inner}</span>;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
