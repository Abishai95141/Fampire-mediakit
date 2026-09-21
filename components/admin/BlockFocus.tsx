"use client";

import { useAllFormFields } from "@payloadcms/ui";
import { useCallback, useEffect, useState } from "react";

import "./BlockFocus.css";

/**
 * Edit one section of a page, rather than hunting for it in fourteen.
 *
 * The site has an "Edit section" handle on every block, and it linked to
 * `/admin/collections/pages/<id>` — the whole document, unscrolled, with no
 * indication which of the fourteen rows drew the thing just clicked. The
 * handle answered "the CMS is over there" and not "here is the thing".
 *
 * So the link now carries `?block=<row id>`, and this narrows the form to
 * that row: everything else is folded away, the target is expanded if it was
 * collapsed, and a bar at the top says what is being edited with one click
 * back to the whole page.
 *
 * ── Why it works on the DOM rather than replacing the view ──────────────
 *
 * The obvious implementation is a custom document view that renders only the
 * block's fields with `RenderFields`. It is the wrong trade here: a custom
 * document view is wrapped in `DocumentInfoProvider` and `LivePreviewProvider`
 * but NOT in a `Form` — `DefaultEditView` establishes that itself — so a
 * focused view would have to rebuild the form, its state, its validation and
 * its save controls, and would then drift from Payload's own on every
 * upgrade. Publishing, drafts and the child-safety rules all hang off that
 * form and none of them are worth re-implementing for a filter.
 *
 * Narrowing what is SHOWN keeps one form, one save, one set of rules.
 *
 * ── It degrades to nothing ─────────────────────────────────────────────
 *
 * Every step is guarded. No parameter, no matching row, a changed Payload
 * class name — each ends in the untouched stock form rather than an error.
 * The worst case is that this does nothing, which is exactly today.
 */

/** Payload's own class names, in one place because they are the coupling. */
const ROW = ".blocks-field__row";
const COLLAPSED = "collapsible--collapsed";
const TOGGLE = ".collapsible__toggle";
const PILL = ".blocks-field__block-pill";
const DIM = "fam-block-away";

/** `?block=<row id>`, read off the URL rather than through a hook so this
 *  needs no Suspense boundary and no router context. */
function wantedId(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("block");
  return v && v.trim() ? v.trim() : null;
}

export function BlockFocus() {
  const [fields] = useAllFormFields();
  const [label, setLabel] = useState<string | null>(null);

  /** Show every row again, and forget we were ever focused. */
  const showAll = useCallback(() => {
    document.querySelectorAll(`.${DIM}`).forEach((el) => el.classList.remove(DIM));
    const url = new URL(window.location.href);
    url.searchParams.delete("block");
    window.history.replaceState(null, "", url.toString());
    setLabel(null);
  }, []);

  useEffect(() => {
    const want = wantedId();
    if (!want) return;

    /**
     * Find the row by ID and use its INDEX.
     *
     * Form state keys the rows `layout.0.id`, `layout.1.id`… so the id gives
     * the position, and the position is what the DOM preserves. Matching on
     * the id rather than on an index in the URL is deliberate: `useField`'s
     * own documentation warns that a path built from an index goes stale the
     * moment somebody reorders the rows, and reordering is a thing this form
     * exists to do.
     */
    let index: number | null = null;
    for (const [key, state] of Object.entries(fields ?? {})) {
      const m = /^layout\.(\d+)\.id$/.exec(key);
      if (m && String((state as { value?: unknown })?.value ?? "") === want) {
        index = Number(m[1]);
        break;
      }
    }
    if (index === null) return;

    // Payload may still be building the rows when this first runs.
    let tries = 0;
    const apply = () => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(ROW));
      if (!rows.length || !rows[index!]) {
        if (tries++ < 20) window.setTimeout(apply, 100);
        return;
      }
      const target = rows[index!];
      rows.forEach((el, i) => el.classList.toggle(DIM, i !== index));

      // A section reached by a direct link should be open, whatever the
      // editor last left collapsed.
      if (target.querySelector(`.${COLLAPSED}`) || target.classList.contains(COLLAPSED)) {
        target.querySelector<HTMLElement>(TOGGLE)?.click();
      }

      // The pill already carries the block's human name, so there is no
      // second table of labels here to fall out of step with the first.
      setLabel(target.querySelector(PILL)?.textContent?.trim() || "this section");
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    apply();

    return () => {
      document.querySelectorAll(`.${DIM}`).forEach((el) => el.classList.remove(DIM));
    };
  }, [fields]);

  if (!label) return null;

  return (
    <div className="fam-focus-bar">
      <span className="fam-focus-bar__what">
        Editing <b>{label}</b>
      </span>
      <button type="button" className="fam-focus-bar__all" onClick={showAll}>
        Show the whole page
      </button>
    </div>
  );
}

export default BlockFocus;
