import Link from "next/link";

import { currentUser } from "@/lib/fampire/auth";

/**
 * The bridge between seeing something and changing it.
 *
 * The CMS was complete and invisible: every page was assembled from blocks and
 * every collection was editable, but nothing on the site said so, so the only
 * way to find the editor for what you were looking at was to know the admin
 * URL scheme by heart. "Where do I change this?" is the question the product
 * has to answer, and a link on the thing itself is the answer.
 *
 * Renders NOTHING for a signed-out reader — not hidden with CSS, not present
 * in the markup. Public press surfaces stay completely ungated (§2.4) and a
 * press contact must never see editorial furniture.
 */
export default async function EditBar({
  collection,
  id,
  label,
  extra,
}: {
  collection: string;
  id: number | string;
  /** What is being edited, in the editor's own words. */
  label: string;
  /** An additional link, e.g. "Add a collection" on the Library. */
  extra?: { href: string; label: string };
}) {
  const user = await currentUser();
  if (!user) return null;

  return (
    <div className="border-b border-fam-rule bg-[#faf9f6] print:hidden">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5 sm:px-10 lg:px-12">
        <span className="fam-meta text-[10px] uppercase tracking-[0.14em] text-fam-faint">
          Editing as {user.name || user.email}
        </span>
        <Link
          href={`/admin/collections/${collection}/${id}`}
          className="fam-underline text-[12px] font-semibold text-fam-ink"
        >
          Edit “{label}” →
        </Link>
        {extra ? (
          <Link
            href={extra.href}
            className="fam-underline text-[12px] font-semibold text-fam-ink"
          >
            {extra.label} →
          </Link>
        ) : null}
        <Link
          href="/admin"
          className="fam-underline ml-auto text-[12px] text-fam-muted hover:text-fam-ink"
        >
          Open the CMS
        </Link>
      </div>
    </div>
  );
}
