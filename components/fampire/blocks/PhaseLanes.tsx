import Link from "next/link";

/**
 * The numbered progression: picture on the left, card on the right carrying an
 * oversized ghost numeral, with a rail running down the join.
 *
 * The approved layout uses this for four programme phases. FAMPIRE's four
 * intent lanes — book them, write about them, clip them, stage them — are
 * already the same shape (label, one line of detail, a link), so this is the
 * existing block rendered differently rather than new content invented to fill
 * a template slot.
 *
 * The pictures are not uploads. Each lane already points at a filtered Library
 * view, so the image is a real frame from the collections that lane leads to:
 * the section cannot show a stock photo of work the archive does not contain.
 */
export default function PhaseLanes({
  lanes,
}: {
  lanes: { label: string; detail?: string | null; href: string; src: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {lanes.map((l, i) => (
        <Link
          key={l.href + i}
          href={l.href}
          className="group grid items-stretch gap-0 overflow-hidden rounded-[18px] sm:grid-cols-2"
        >
          <div className="relative overflow-hidden bg-[#ece9e4]">
            {l.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.src}
                alt=""
                className="h-full min-h-[220px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] sm:min-h-[300px]"
              />
            ) : (
              <div className="min-h-[220px] sm:min-h-[300px]" />
            )}
          </div>

          <div
            className="relative flex flex-col justify-center overflow-hidden p-7 sm:p-10"
            style={{ background: "var(--z-panel, #f4f2ee)" }}
          >
            {/* The ghost numeral. aria-hidden: the order is already carried by
                the list, and a screen reader announcing "zero one" before every
                heading is noise. */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none font-semibold leading-none"
              style={{
                fontSize: "clamp(96px, 15vw, 210px)",
                letterSpacing: "-0.05em",
                color: "var(--z-ink)",
                opacity: 0.06,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <h3 className="z-h3 relative max-w-[10ch]">{l.label}</h3>
            {l.detail ? (
              <p className="z-body relative mt-4 max-w-[38ch] text-[15px]">{l.detail}</p>
            ) : null}
            <span className="relative mt-6 inline-flex items-center gap-2 text-[13px] font-medium">
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
