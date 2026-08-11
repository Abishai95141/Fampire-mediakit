import Link from "next/link";
import Preview from "@/components/fampire/Preview";
import {
  BRAND_LABEL,
  PLATFORM_LABEL,
  SUBJECT_LABEL,
  type Entry,
} from "@/lib/fampire/catalog";

/**
 * One catalog row.
 *
 * Two things it must never do:
 *  - present a locked collection as if it opened (a dead click is worse than
 *    an honest lock), or
 *  - present a collection flagged as containing a minor without saying so.
 * Both states are on the card, not discovered on click.
 */
export default function EntryCard({ entry, signedIn }: { entry: Entry; signedIn: boolean }) {
  const locked = entry.visibility === "private" && !signedIn;
  // Measured by the nightly sweep, not guessed from the URL. A card must never
  // offer a click that lands on a 404 or a sign-in wall — the reader has
  // already spent their trust by the time they find out.
  const dead = entry.access === "broken" || entry.status === "gone";
  const needsAccount = entry.status === "login-required" || entry.access === "request";

  const body = (
    <>
      <Preview
        entry={entry}
        shape="wide"
        width={760}
        className={locked ? "grayscale" : ""}
      />

      <p className="fam-eyebrow-muted mt-4">
        {[entry.year, PLATFORM_LABEL[entry.source_platform], entry.kind]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <h3 className="fam-display-sm mt-2 text-[19px] leading-snug">{entry.title}</h3>

      <p className="mt-2 max-w-prose text-[14px] leading-[1.65] text-fam-body">
        {entry.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {locked ? (
          <span className="border border-fam-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fam-ink">
            Sign in to open
          </span>
        ) : dead ? (
          <span className="border border-fam-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fam-accent">
            Link is dead at source
          </span>
        ) : needsAccount ? (
          <span className="border border-fam-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fam-accent">
            {entry.source_platform === "dropbox"
              ? "Owner-only path"
              : "Sign-in required at source"}
          </span>
        ) : entry.access === "password" ? (
          <span className="border border-fam-ink/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fam-muted">
            Password at source
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-fam-ink">
            Open in {PLATFORM_LABEL[entry.source_platform]} ↗
          </span>
        )}

        {entry.contains_minor ? (
          <span
            className="border border-fam-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fam-accent"
            title="Features a child. Publication of this collection requires written sign-off."
          >
            Features a minor
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-fam-faint">
        {entry.subjects.map((sub) => (
          <span key={sub}>{SUBJECT_LABEL[sub] ?? sub}</span>
        ))}
        {entry.brands.map((b) => (
          <span key={b}>{BRAND_LABEL[b] ?? b}</span>
        ))}
      </div>
    </>
  );

  const shell = "fam-card group block py-8";

  if (locked) {
    return (
      <article className={shell}>
        <Link href="/fampire/login?next=/fampire/library" className="block">
          {body}
        </Link>
      </article>
    );
  }

  if (dead || needsAccount) {
    // Rendering this as a live link would send a journalist to a 404 or to a
    // page only the account owner can load. Flag it instead of pretending.
    return <article className={`${shell} opacity-75`}>{body}</article>;
  }

  return (
    <article className={shell}>
      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="block">
        {body}
      </a>
    </article>
  );
}
