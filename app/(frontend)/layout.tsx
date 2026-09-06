import type { Metadata } from "next";
import { Caveat, Geist, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

/**
 * The landing page's face, and only the landing page's.
 *
 * The Zeen layout the client approved is set in Geist throughout — 128px
 * wordmark, 64px section heads, all on tight negative tracking that Jakarta
 * does not hold at that size. Loading it here rather than in the page keeps
 * next/font's build-time subsetting and self-hosting; it is applied through
 * the `.zeen` scope in globals.css, so /library, /films, /people and /press
 * keep Jakarta and are not touched by any of this.
 */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  /**
   * Not preloaded. The variable is declared on <html> so the `.zeen` scope can
   * reach it, but only the landing page ever matches those selectors — with
   * the default `preload: true`, /library, /films, /people and /press would
   * each fetch a font none of them render a single glyph in. It still loads on
   * the landing page, just on first use rather than ahead of it.
   */
  preload: false,
});

/** Primary. Variable, so the 400/500/600/700/800 steps the hierarchy leans on
 *  cost one file rather than five. */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/** Secondary — the small letter-spaced furniture only: eyebrows, labels,
 *  buttons, metadata. */
const poppins = Poppins({
  variable: "--font-poppins-fam",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/**
 * The margin hand.
 *
 * The approved "Lately" layout annotates itself the way someone would mark up
 * a contact sheet — a note beside the title, a note in the top corner. That
 * only reads as a hand if it IS one; setting it in the display face just looks
 * like a smaller heading. Not preloaded: one section of one page uses it.
 */
const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "FAMPIRE — Media Center",
    template: "%s — FAMPIRE Media Center",
  },
  description:
    "The press room for The Lolli Family Institution. Films, people, events and the full media library — searchable, described in plain language, and linked straight to the source.",
  openGraph: { siteName: "FAMPIRE Media Center", type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${poppins.variable} ${geist.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
