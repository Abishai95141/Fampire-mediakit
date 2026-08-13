import Shell from "@/components/fampire/Shell";
import FampireSmoothScroll from "@/components/fampire/SmoothScroll";
import { loadChrome, loadEntries } from "@/lib/fampire/catalog";
import { isSignedIn } from "@/lib/fampire/auth";

/**
 * The FAMPIRE Media Center shell.
 *
 * Sits inside the same Next app as the HNN portal but shares nothing with it
 * above the auth module: its own typeface, its own palette (app/globals.css,
 * `--fam-*`), its own chrome, its own access model. HNN's route group, layout
 * and proxy behaviour are untouched — FAMPIRE is appended, not merged.
 *
 * Fonts load HERE rather than in the root layout, so the HNN portal never
 * downloads a typeface it doesn't use. Inter Tight comes free: the root layout
 * already puts `--font-inter-tight` on <html>; FAMPIRE overrides it under
 * `.fam` and brings its own two faces.
 */

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  // One boolean is FAMPIRE's entire contract with auth — see lib/fampire/auth.ts.
  const signedIn = await isSignedIn();
  // Live count, so the masthead cannot drift from the catalog.
  const entries = await loadEntries();
  // Masthead and footer, edited in the CMS.
  const chrome = await loadChrome();

  return (
    <div
      className={"fam min-h-screen bg-fam-paper"}
    >
      {/* Wraps rather than sits beside, so the Lenis instance is on context
          and the preloader can suspend scrolling properly instead of locking
          the body out from under it. */}
      <FampireSmoothScroll>
        <Shell
          total={entries.length}
          signedIn={signedIn}
          nav={chrome.nav}
          footer={chrome.footer}
        >
          {children}
        </Shell>
      </FampireSmoothScroll>
    </div>
  );
}
