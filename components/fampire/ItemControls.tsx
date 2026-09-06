"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Per-item controls: edit this record, or take it off this page.
 *
 * The section-level handle answered "where do I change this section". It did
 * not answer the thing actually asked for, which is per-ELEMENT: pick one
 * card, one portrait, one wordmark, and remove or edit THAT.
 *
 * "Remove" here means removed from this section of this page. It is not a
 * delete: the person, brand or film keeps existing, keeps its collections and
 * still appears on /people, /films and in the Library. That distinction is
 * the reason this is a hide list on the page rather than a destructive
 * action, and the confirm copy says so in as many words — an editor should
 * never have to guess whether a ✕ is about to remove someone from the site.
 *
 * Renders nothing at all when signed out, so no admin URL and no write
 * affordance reaches a public visitor.
 */
export default function ItemControls({
  signedIn,
  pageId,
  blockIndex,
  collection,
  id,
  label,
  className = "",
}: {
  signedIn: boolean;
  pageId?: number | string;
  blockIndex?: number;
  /** Admin collection slug, e.g. "people". */
  collection: string;
  id?: number | string | null;
  /** What this item is called, for the confirm and the aria-label. */
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  if (!signedIn || id == null) return null;
  const canHide = pageId != null && typeof blockIndex === "number";

  const hide = async () => {
    if (
      !window.confirm(
        `Remove ${label} from this section of the landing page?\n\n` +
          `It stays in the CMS and everywhere else on the site — this only takes it off this page. You can put it back from the section's "Hidden on this page" field.`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, blockIndex, value: id, action: "hide" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        window.alert(`Could not remove it: ${j.error ?? res.status}`);
        return;
      }
      // Re-render from the server so the page shows the new truth rather than
      // a local guess at it.
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  };

  return (
    <span className={`fam-item-controls print:hidden ${className}`}>
      <a
        href={`/admin/collections/${collection}/${id}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Edit ${label}`}
      >
        Edit
      </a>
      {canHide ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void hide();
          }}
          disabled={pending || busy}
          aria-label={`Remove ${label} from this page`}
          title="Remove from this page (does not delete)"
        >
          {pending || busy ? "…" : "✕"}
        </button>
      ) : null}
    </span>
  );
}
