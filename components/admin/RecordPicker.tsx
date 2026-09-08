"use client";

import { useField } from "@payloadcms/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import "./RecordPicker.css";

/**
 * Pick related records by looking at them, instead of reading a dropdown.
 *
 * Generalised from the people-only version so the brand — the client's word is
 * "publishers" — and the two crew roles get the same control. Only the INPUT
 * is replaced: every field below is the relationship it always was, writing
 * the same IDs, so nothing about the stored data, the API or the read layer
 * changes and removing the `components` block restores the stock control.
 *
 * Configured entirely through `clientProps`, because the four fields differ in
 * ways that are data, not code: one of them holds a single value, one pins the
 * family to the top, one badges children, and one has no pictures at all.
 *
 * Not every collection has a portrait. Brands carry a name and a tagline and
 * nothing else, so their tiles render as wordmarks — which is how the brands
 * read on the public site too, rather than a placeholder pretending a logo is
 * missing.
 */

type Record_ = {
  id: number | string;
  name?: string;
  title?: string;
  role?: string | null;
  tagline?: string | null;
  portraitUrl?: string | null;
  portraitImage?: { url?: string | null } | string | null;
  [key: string]: unknown;
};

export type RecordPickerProps = {
  path?: string;
  field?: { name?: string };
  readOnly?: boolean;
  /** Which collection to browse. Defaults to People. */
  collection?: string;
  /** False for a single-value relationship, where picking replaces. */
  hasMany?: boolean;
  /** The line above the grid. */
  heading?: string;
  /** A boolean field whose `true` records are shown first, larger. */
  pinField?: string;
  pinLabel?: string;
  restLabel?: string;
  /** A boolean field that earns a small badge — `isMinor`, in practice. */
  badgeField?: string;
  badgeLabel?: string;
};

const labelOf = (r: Record_) => (r.name ?? r.title ?? String(r.id)) as string;
const subtitleOf = (r: Record_) => r.role ?? r.tagline ?? null;

const pictureOf = (r: Record_): string | null => {
  const img = r.portraitImage;
  if (img && typeof img === "object" && img.url) return img.url;
  return r.portraitUrl ?? null;
};

const idOf = (v: unknown): number | string | null => {
  if (v == null) return null;
  if (typeof v === "object") return (v as { id?: number | string }).id ?? null;
  return v as number | string;
};

const initials = (name: string) =>
  name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/**
 * One fetch per collection per admin session, shared by every field using it.
 *
 * These lists are small, change rarely and are identical for every row an
 * editor opens; four pickers on one page must not mean four requests, and the
 * next collection opened must not refetch what is already in memory.
 */
const caches = new Map<string, Promise<Record_[]>>();

const load = (apiBase: string, collection: string): Promise<Record_[]> => {
  const hit = caches.get(collection);
  if (hit) return hit;
  const p = fetch(`${apiBase}/${collection}?limit=500&depth=1&sort=name`, { credentials: "include" })
    .then((r) => {
      if (!r.ok) throw new Error(`${collection} ${r.status}`);
      return r.json();
    })
    .then((j) => (Array.isArray(j?.docs) ? (j.docs as Record_[]) : []))
    .catch((e) => {
      // Never cache a failure — the next mount should be allowed to retry.
      caches.delete(collection);
      throw e;
    });
  caches.set(collection, p);
  return p;
};

export function RecordPicker({
  collection = "people",
  hasMany = true,
  heading = "Who is in this collection",
  pinField,
  pinLabel = "Pinned",
  restLabel = "Everyone else",
  badgeField,
  badgeLabel = "child",
  ...props
}: RecordPickerProps) {
  /**
   * `path` over `field.name` — they diverge inside an array, a block or a
   * group, where the path carries the index and the name does not.
   */
  const path = props.path ?? props.field?.name ?? "people";
  const { value, setValue } = useField<unknown>({ path });
  const readOnly = Boolean(props.readOnly);

  const [records, setRecords] = useState<Record_[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    /**
     * Read the API base off the window rather than hardcoding it. Payload is
     * served at `/payload-api` here, not the default `/api`, and a hardcoded
     * default would 404 while looking perfectly correct in review.
     */
    const apiBase =
      (typeof window !== "undefined" && (window as { __PAYLOAD_API__?: string }).__PAYLOAD_API__) ||
      "/payload-api";
    load(apiBase, collection)
      .then((docs) => alive.current && setRecords(docs))
      .catch((e) => alive.current && setError(e instanceof Error ? e.message : "could not load"));
    return () => {
      alive.current = false;
    };
  }, [collection]);

  const selected = useMemo(() => {
    const raw = hasMany ? (Array.isArray(value) ? value : []) : value == null ? [] : [value];
    return new Set(raw.map(idOf).filter((x) => x != null).map(String));
  }, [value, hasMany]);

  const toggle = (id: number | string) => {
    if (readOnly) return;
    const on = selected.has(String(id));
    if (!hasMany) {
      // A single relationship: picking replaces, picking the chosen one clears.
      setValue(on ? null : id);
      return;
    }
    const current = (Array.isArray(value) ? value : []).map(idOf).filter((x) => x != null) as (number | string)[];
    setValue(on ? current.filter((c) => String(c) !== String(id)) : [...current, id]);
  };

  const { pinned, rest, chosen } = useMemo(() => {
    const all = records ?? [];
    const needle = q.trim().toLowerCase();
    const match = (r: Record_) =>
      !needle ||
      labelOf(r).toLowerCase().includes(needle) ||
      (subtitleOf(r) ?? "").toLowerCase().includes(needle);
    const isPinned = (r: Record_) => Boolean(pinField && r[pinField]);
    return {
      pinned: pinField ? all.filter(isPinned) : [],
      rest: all.filter((r) => !isPinned(r) && match(r)),
      chosen: all.filter((r) => selected.has(String(r.id))),
    };
  }, [records, q, selected, pinField]);

  const Tile = ({ r, big = false }: { r: Record_; big?: boolean }) => {
    const on = selected.has(String(r.id));
    const src = pictureOf(r);
    const name = labelOf(r);
    const sub = subtitleOf(r);
    return (
      <button
        type="button"
        className={`rp-tile${big ? " rp-tile--big" : ""}${on ? " is-on" : ""}`}
        onClick={() => toggle(r.id)}
        aria-pressed={on}
        disabled={readOnly}
        title={sub ? `${name} — ${sub}` : name}
      >
        <span className="rp-face">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="rp-initials">{initials(name)}</span>
          )}
          {on ? <span className="rp-check" aria-hidden="true">✓</span> : null}
        </span>
        <span className="rp-name">{name}</span>
        {badgeField && r[badgeField] ? <span className="rp-minor">{badgeLabel}</span> : null}
      </button>
    );
  };

  if (error) {
    return (
      <div className="rp-root">
        <div className="rp-error">
          Could not load {collection} ({error}). Reload the page to try again.
        </div>
      </div>
    );
  }

  return (
    <div className="rp-root">
      <div className="rp-head">
        <span className="rp-legend">{heading}</span>
        <span className="rp-count">
          {hasMany ? `${selected.size} tagged` : selected.size ? "1 chosen" : "none chosen"}
        </span>
      </div>

      {records === null ? (
        <div className="rp-loading">Loading…</div>
      ) : (
        <>
          {chosen.length ? (
            <div className="rp-chosen">
              {chosen.map((r) => (
                <button
                  key={`sel-${r.id}`}
                  type="button"
                  className="rp-chip"
                  onClick={() => toggle(r.id)}
                  disabled={readOnly}
                  title="Remove"
                >
                  {labelOf(r)}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}

          {pinned.length ? (
            <>
              <div className="rp-section">{pinLabel}</div>
              <div className="rp-grid rp-grid--family">
                {pinned.map((r) => (
                  <Tile key={r.id} r={r} big />
                ))}
              </div>
            </>
          ) : null}

          <div className="rp-section rp-section--search">
            <span>{pinned.length ? restLabel : ""}</span>
            <input
              className="rp-search"
              type="search"
              value={q}
              placeholder="Search by name…"
              onChange={(e) => setQ(e.target.value)}
              disabled={readOnly}
            />
          </div>

          {rest.length ? (
            <div className="rp-grid">
              {rest.map((r) => (
                <Tile key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <div className="rp-empty">Nothing matches “{q}”.</div>
          )}
        </>
      )}
    </div>
  );
}

export default RecordPicker;
