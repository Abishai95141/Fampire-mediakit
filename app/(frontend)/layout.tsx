import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${jakarta.variable} ${poppins.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
