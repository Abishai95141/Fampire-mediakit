import Link from "next/link";

/**
 * The four intent lanes, as a ledger rather than a picture strip.
 *
 * This started as the approved layout's picture-beside-each progression and
 * that was wrong twice over. The pictures were enormous, leaving the text
 * column mostly empty; and because a lane is a FILTER, not a collection, the
 * frame pulled for it was whatever happened to sit at the top of that filter —
 * so "Book them", which leads to headshots, was fronted by the key art for a
 * documentary about cats. A picture that has to be chosen by machine for a
 * category will keep doing that.
 *
 * What a lane actually needs to say is how much is behind it, and that is a
 * number this system already knows. Showing it is also honest in a way the
 * pictures were not: it makes plain that "Book them" reaches four collections
 * while "Clip them" reaches 196 — which is a real gap in the archive, not
 * something to paper over with a nice photograph.
 *
 * Deliberately unlike its neighbours: no imagery, no ghost numerals, no
 * accordion. Four type-and-number cards, so the page changes gear here.
 */
export default function PhaseLanes({
  lanes,
}: {
  lanes: {
    label: string;
    detail?: string | null;
    href: string;
    collections: number;
    files: number;
  }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      {lanes.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="group flex flex-col justify-between rounded-[18px] p-7 transition-transform duration-500 hover:-translate-y-1 sm:p-9"
          style={{ background: "var(--z-panel, #f4f2ee)", minHeight: 280 }}
        >
          <div>
            <h3 className="z-h3" style={{ fontSize: "clamp(24px, 2.8vw, 38px)" }}>
              {l.label}
            </h3>
            {l.detail ? (
              <p className="z-body mt-3 max-w-[34ch] text-[15px]">{l.detail}</p>
            ) : null}
          </div>

          <div className="mt-8 flex items-end justify-between gap-6">
            <div>
              {/* The count is the point of the card, so it is set at display
                  size. Tabular figures so the four cards align down the grid
                  instead of wobbling with the digit widths. */}
              <p
                className="font-semibold leading-none"
                style={{
                  fontSize: "clamp(34px, 4.4vw, 56px)",
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {l.collections.toLocaleString("en-GB")}
              </p>
              <p className="z-label mt-2">
                {l.collections === 1 ? "collection" : "collections"}
                {l.files ? ` · ${l.files.toLocaleString("en-GB")} files` : ""}
              </p>
            </div>

            <span className="inline-flex items-center gap-2 pb-1 text-[13px] font-medium">
              Open
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
