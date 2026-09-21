import type { ServerFunctionClient } from "payload";

import config from "@payload-config";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import React from "react";

import { importMap } from "./admin/importMap.js";

import "@payloadcms/next/css";
/**
 * The house skin. AFTER Payload's stylesheet, because it overrides the colour
 * ramp that stylesheet defines — and there is no `admin.css` config option in
 * 3.88 to do it through. See the file header for why it changes variables
 * rather than components.
 */
import "@/components/admin/theme.css";

/**
 * The same face the site's own pages use.
 *
 * Jakarta, not the Geist the landing page runs: Geist is scoped to the `.zeen`
 * layer for that one approved layout, while Jakarta is what /library, /films,
 * /people and /press are set in — and those are the surfaces this CMS edits.
 *
 * Self-hosted and subset at build time by next/font, so the admin makes no
 * request to Google at runtime and a slow network cannot leave an editor
 * looking at a blank page.
 */
const adminFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-admin",
});

/**
 * The display face, for the dashboard's headings only.
 *
 * Everything else in the admin stays in Jakarta — a serif in a form label or
 * a table header is harder to scan, and this CMS is mostly forms and tables.
 * It earns its place on the one screen that is read rather than worked in.
 */
const displayFont = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
  variable: "--font-admin-display",
});

/**
 * Payload's admin owns its own <html> and <body>, which is why the FAMPIRE
 * front end had to move into a sibling (frontend) route group. Route groups do
 * not appear in URLs, so every public path is byte-identical to before.
 */
const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
      /* Payload renders <html> itself, so the font variable has to be handed
         to it rather than set on a wrapper — `htmlProps` is the seam it
         provides for exactly this. */
      htmlProps={{ className: `${adminFont.variable} ${displayFont.variable}` }}
    >
      {children}
    </RootLayout>
  );
}
