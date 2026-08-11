import type { Metadata } from "next";
import Link from "next/link";
import FampireLoginForm from "@/components/fampire/LoginForm";
import { PUBLIC_ENTRIES, ENTRIES } from "@/lib/fampire/catalog";

/**
 * The FAMPIRE sign-in.
 *
 * Unlike HNN's login this is NOT the entry point to the product — most of
 * FAMPIRE is open, and someone reaching this page has hit one of the small
 * number of held-back collections. The page says so plainly rather than
 * implying a wall, and it always offers the way back to the open library.
 */

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the FAMPIRE Media Center to open restricted collections.",
};

export default async function FampireLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const held = ENTRIES.length - PUBLIC_ENTRIES.length;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-[1320px] items-center gap-16 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-24 lg:px-12">
      <div>
        <p className="fam-eyebrow fam-rise">
          <span>FAMPIRE Media Center</span>
        </p>
        <h1 className="fam-display mt-6 text-5xl leading-[1.06] sm:text-6xl lg:text-[4.6rem]">
          <span className="fam-rise">
            <span>Most of this</span>
          </span>
          <span className="fam-rise" style={{ "--fam-delay": "0.08s" } as React.CSSProperties}>
            <span>is already open.</span>
          </span>
        </h1>
        <p className="mt-8 max-w-md text-[16.5px] leading-[1.68] text-fam-body">
          {PUBLIC_ENTRIES.length} of {ENTRIES.length} collections need no
          account at all. {held} are held back — password-gated by the platform
          that stores them, or waiting on written sign-off before they publish.
          Sign-in is for those.
        </p>
        <Link
          href="/fampire/library"
          className="fam-underline mt-8 inline-block text-[14px] font-semibold text-fam-ink"
        >
          Back to the open library →
        </Link>
      </div>

      <div className="lg:border-l-2 lg:border-fam-ink lg:pl-16 xl:pl-24">
        <div className="max-w-sm">
          <p className="fam-display-sm text-[24px]">Sign in</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-fam-body">
            Accounts are issued by the media team.
          </p>

          <FampireLoginForm next={next} />

          <p className="mt-10 border-t border-fam-rule pt-6 text-[12.5px] leading-relaxed text-fam-muted">
            Collections that feature Love or Legend Lolli carry a review flag
            and stay closed until a named person has confirmed each one in
            writing. Signing in does not lift that.
          </p>
        </div>
      </div>
    </div>
  );
}
