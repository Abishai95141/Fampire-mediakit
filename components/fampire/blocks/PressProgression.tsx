import Link from "next/link";

/**
 * The press log in the approved layout's numbered progression: still on the
 * left, card on the right carrying an oversized ghost numeral, a rail down the
 * join.
 *
 * The full log had been a plain list — the section the client called boring,
 * and fairly: 57 rows of title, outlet and date is a spreadsheet. Numbering it
 * is also more honest than it looks, because this list is ordered. It is the
 * curated order the CMS holds (drag-to-reorder on Appearances), so "01" means
 * the appearance the team put first, not an arbitrary index.
 *
 * Server component: nothing here needs state, and the stills are remote
 * thumbnails from the platforms themselves — nothing is rehosted.
 */

export type ProgressionItem = {
  title: string;
  outlet?: string | null;
  aired?: string | null;
  views?: number | null;
  thumbnail?: string | null;
  url?: string | null;
};

const airedLabel = (d?: string | null) => {
  if (!d) return null;
  const t = Date.parse(String(d));
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function PressProgression({ items }: { items: ProgressionItem[] }) {
  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {items.map((a, i) => {
        const meta = [a.outlet, airedLabel(a.aired)].filter(Boolean).join(" · ");
        const Body = (
          <>
            <div className="relative overflow-hidden bg-[#ece9e4]">
              {a.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.thumbnail}
                  alt=""
                  className="h-full min-h-[200px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] sm:min-h-[280px]"
                />
              ) : (
                <div className="min-h-[200px] sm:min-h-[280px]" />
              )}
            </div>

            <div
              className="relative flex flex-col justify-center overflow-hidden p-7 sm:p-10"
              style={{ background: "var(--z-panel, #f4f2ee)", color: "#121212" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none font-semibold leading-none"
                style={{
                  fontSize: "clamp(88px, 14vw, 190px)",
                  letterSpacing: "-0.05em",
                  color: "#121212",
                  opacity: 0.06,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {meta ? (
                <p className="relative mb-3 text-[11px] uppercase tracking-[0.14em]" style={{ opacity: 0.5 }}>
                  {meta}
                </p>
              ) : null}

              <h3
                className="relative max-w-[22ch] font-medium"
                style={{ fontSize: "clamp(20px, 2.6vw, 30px)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {a.title}
              </h3>

              <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                {/* Reproduced exactly as the client recorded it, never
                    estimated or rounded up. */}
                {a.views ? (
                  <span style={{ opacity: 0.55 }} className="tabular-nums">
                    {a.views.toLocaleString("en-GB")} views
                  </span>
                ) : null}
                {a.url ? (
                  <span className="inline-flex items-center gap-2 font-medium">
                    Watch
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </>
        );

        const shell = "group grid items-stretch overflow-hidden rounded-[18px] sm:grid-cols-2";
        return a.url ? (
          <a key={a.title + i} href={a.url} target="_blank" rel="noopener noreferrer" className={shell}>
            {Body}
          </a>
        ) : (
          <div key={a.title + i} className={shell}>
            {Body}
          </div>
        );
      })}

      <Link
        href="/press"
        className="mt-2 inline-flex items-center gap-2 self-start text-[14px] font-medium underline underline-offset-4"
      >
        The full log — every appearance
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
