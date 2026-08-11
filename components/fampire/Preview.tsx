import { PLATFORM_LABEL, type Entry } from "@/lib/fampire/catalog";
import { wixImage } from "@/lib/fampire/media";

/**
 * The preview well.
 *
 * Every card gets one, always — a grid where some tiles carry an image and
 * others are bare text has no rhythm, and the text-only ones read as broken
 * rather than as a deliberate variant.
 *
 * Where no picture exists (Dropbox shared folders publish nothing a server can
 * read — 13 collections), the well becomes a typographic plate: the kind of
 * material set large in the display serif over the paper neutral, with the
 * platform named. It is unmistakably a plate rather than a photograph, so it
 * never implies a picture of contents we have not seen.
 */

const RATIO: Record<string, string> = {
  wide: "aspect-[3/2]",
  tall: "aspect-[4/5]",
  square: "aspect-square",
  cinema: "aspect-[16/9]",
};

/** Google's thumbnail service takes the width in the URL. */
function sized(url: string, width: number): string {
  if (url.includes("drive.google.com/thumbnail")) {
    return url.replace(/sz=w\d+/, `sz=w${width}`);
  }
  if (url.includes("static.wixstatic.com")) {
    return wixImage(url, width, Math.round(width * 0.66)) ?? url;
  }
  return url;
}

export default function Preview({
  entry,
  shape = "wide",
  width = 900,
  className = "",
}: {
  entry: Pick<
    Entry,
    "image" | "title" | "kind" | "source_platform" | "image_source" | "image_flat"
  >;
  shape?: keyof typeof RATIO;
  width?: number;
  className?: string;
}) {
  const ratio = RATIO[shape];

  if (!entry.image) {
    return (
      <div className={`fam-well relative flex ${ratio} w-full items-end ${className}`}>
        <div className="w-full p-5">
          <p className="fam-display text-[clamp(1.4rem,3.6vw,2.2rem)] leading-[1.08] text-white">
            {entry.kind}
          </p>
          <p className="fam-eyebrow-muted mt-2 text-white/55">
            {PLATFORM_LABEL[entry.source_platform]} · no public preview
          </p>
        </div>
        {/* A single hairline corner, echoing the preloader's crop marks, so the
            plate reads as part of the system rather than as a failed image. */}
        <span
          aria-hidden
          className="absolute right-4 top-4 h-4 w-4 border-r border-t border-white/30"
        />
      </div>
    );
  }

  return (
    <div className={`fam-well ${ratio} w-full ${className} ${entry.image_flat ? "p-6" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sized(entry.image, width)}
        alt={entry.title}
        loading="lazy"
        decoding="async"
        /* Google's thumbnail endpoint answers 429 to ANY request carrying a
           Referer it does not recognise — which is every request from our
           origin. Suppressing the header is the whole fix; with it the same
           URL returns 200. Harmless for the other hosts. */
        referrerPolicy="no-referrer"
        className={`fam-zoom h-full w-full ${entry.image_flat ? "object-contain" : "object-cover"}`}
      />
    </div>
  );
}

/**
 * The same well for things that are not catalog entries — a press appearance,
 * a film. Kept separate so the entry version can stay strictly typed.
 */
export function ImageWell({
  src,
  alt,
  label,
  shape = "cinema",
  width = 900,
  className = "",
}: {
  src: string | null;
  alt: string;
  /** Shown on the plate when there is no image. */
  label: string;
  shape?: keyof typeof RATIO;
  width?: number;
  className?: string;
}) {
  const ratio = RATIO[shape];

  if (!src) {
    return (
      <div className={`fam-well flex ${ratio} w-full items-end ${className}`}>
        <p className="fam-display p-5 text-[clamp(1.2rem,2.8vw,1.9rem)] leading-[1.08] text-white">
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className={`fam-well ${ratio} w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sized(src, width)}
        alt={alt}
        loading="lazy"
        decoding="async"
        /* Google's thumbnail endpoint answers 429 to ANY request carrying a
           Referer it does not recognise — which is every request from our
           origin. Suppressing the header is the whole fix; with it the same
           URL returns 200. Harmless for the other hosts. */
        referrerPolicy="no-referrer"
        className="fam-zoom h-full w-full object-cover"
      />
    </div>
  );
}
