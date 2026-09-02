import Link from "next/link";

/**
 * A numbered section head.
 *
 * The number and the 2px black rule are the hierarchy. A page of hairline
 * dividers and 45%-grey labels reads as one continuous wash — nothing tells
 * the eye where a section begins, so every section is equally skippable. This
 * gives each one a hard edge and an index, and puts the section's own link on
 * the same line rather than buried at the end of the list.
 *
 * Vertical rhythm lives here too, so spacing between sections is a single
 * decision rather than a per-page guess.
 */
export default function Section({
  n,
  title,
  aside,
  href,
  hrefLabel,
  children,
}: {
  /** "01", "02" … */
  n: string;
  title: string;
  /** Secondary fact for the right of the head — counts, dates, scope. */
  aside?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-16 max-w-[1320px] px-6 sm:mt-24 sm:px-10 lg:px-12">
      <div className="fam-section-rule flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-5">
        {/* The index is its own element purely so a page-level scope can drop
            it. The landing page runs the Zeen layout, which has no numbered
            rules — under `.zeen` this span is hidden and the heading is set at
            display size. Everywhere else it renders exactly as before. */}
        <h2 className="fam-eyebrow">
          <span className="fam-section-n">{n} — </span>
          {title}
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {aside ? (
            <p className="text-[13px] font-medium text-fam-muted">{aside}</p>
          ) : null}
          {href && hrefLabel ? (
            <Link
              href={href}
              className="fam-underline text-[13px] font-semibold text-fam-ink"
            >
              {hrefLabel} →
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}
