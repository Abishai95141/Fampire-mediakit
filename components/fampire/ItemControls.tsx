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
  blockId,
  collection,
  id,
  label,
  className = "",
}: {
  signedIn: boolean;
  pageId?: number | string;
  blockIndex?: number;
  /** The section's row id, so "Edit card" opens THIS section of the page
   *  rather than all fourteen. Optional: without it the link still works and
   *  simply lands on the whole document, as it did before. */
  blockId?: string | null;
  /** The record this card happens to be about, if any. */
  collection: string;
  id?: number | string | null;
  /** What this item is called, for the confirm and the aria-label. */
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  // A card invented on the page has no record, and that is fine — it is still
  // editable, because what you edit is the CARD.
  if (!signedIn) return null;
  const onPage = pageId != null;
  const canHide = pageId != null && typeof blockIndex === "number" && id != null;

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
      {/**
       * "Edit card" opens the PAGE, not the record.
       *
       * This used to link to /admin/collections/people/<id>, which was the
       * whole complaint: clicking edit on a hero card took you to a person,
       * where you could change their canonical portrait but not this card's
       * picture, caption, link or position. The card lives on the page, so
       * that is where editing it happens — and the page editor is also where
       * the cards can be dragged into a different order.
       */}
      {onPage ? (
        <a
          href={
            blockId
              ? `/admin/collections/pages/${pageId}?block=${encodeURIComponent(blockId)}`
              : `/admin/collections/pages/${pageId}`
          }
          onClick={(e) => e.stopPropagation()}
          aria-label={`Edit the ${label} card on this page`}
          title="Edit this card — picture, words, link, order"
        >
          Edit card
        </a>
      ) : null}
      {/* The record, offered separately and clearly labelled, for when
          changing the person really is what you meant. */}
      {id != null ? (
        <a
          href={`/admin/collections/${collection}/${id}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open the ${label} record`}
          title="Open the underlying record (changes it everywhere)"
          className="fam-item-record"
        >
          Record
        </a>
      ) : null}
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
