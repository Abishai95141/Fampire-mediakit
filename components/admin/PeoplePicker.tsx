"use client";

import { useField } from "@payloadcms/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import "./PeoplePicker.css";

/**
 * Tag the people in a collection by their face, not by their name.
 *
 * The relationship this replaces the UI for is `entries.people`, and that one
 * field carries BOTH halves of the site's idea of who is in something: the
 * read layer splits it by `isFamily`, so Anthony, TereZa, Love and Legend
 * become the front end's `subjects` and everyone else becomes "Featuring".
 * There is no second field to keep in step — tagging a face here is the whole
 * of the operation.
 *
 * Nothing about the data changes. This writes the same array of person IDs the
 * stock dropdown wrote, so a collection tagged here is indistinguishable from
 * one tagged before, and turning the component off restores the dropdown with
 * no migration.
 *
 * What it buys is speed on the only job that is actually large: four people
 * recur across 634 collections, and picking them out of a 153-name dropdown is
 * the slow way to say something you can see at a glance.
 */

type Person = {
  id: number | string;
  name?: string;
  slug?: string;
  role?: string | null;
  isFamily?: boolean | null;
  isMinor?: boolean | null;
  portraitUrl?: string | null;
  portraitImage?: { url?: string | null } | string | null;
};

/** Populated at depth 1, a bare id at depth 0. Only the first has a picture. */
const portraitOf = (p: Person): string | null => {
  const img = p.portraitImage;
  if (img && typeof img === "object" && img.url) return img.url;
  return p.portraitUrl ?? null;
};

const idOf = (v: unknown): number | string | null => {
  if (v == null) return null;
  if (typeof v === "object") {
    const id = (v as { id?: number | string }).id;
    return id ?? null;
  }
  return v as number | string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/**
 * One fetch per admin session, shared by every instance of this field.
 *
 * The people list is small, changes rarely, and is identical for every row an
 * editor opens. Refetching it per collection would put a request on the
 * critical path of every single edit for a list that has not changed.
 */
let peopleCache: Promise<Person[]> | null = null;

const loadPeople = (apiBase: string): Promise<Person[]> => {
  if (!peopleCache) {
    peopleCache = fetch(`${apiBase}/people?limit=500&depth=1&sort=name`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`people ${r.status}`);
        return r.json();
      })
      .then((j) => (Array.isArray(j?.docs) ? (j.docs as Person[]) : []))
      .catch((e) => {
        // Do not cache a failure — the next mount should be allowed to retry.
        peopleCache = null;
        throw e;
      });
  }
  return peopleCache;
};

export function PeoplePicker(props: {
  path?: string;
  field?: { name?: string; label?: unknown; admin?: { description?: unknown } };
  readOnly?: boolean;
}) {
  /**
   * `path` over `field.name`.
   *
   * Payload passes both, and they diverge the moment a field sits inside an
   * array, a block or a group — where the path carries the index and the name
   * does not. Reading the name would bind every row to the same form state.
   */
  const path = props.path ?? props.field?.name ?? "people";
  const { value, setValue } = useField<(number | string)[]>({ path });
  const readOnly = Boolean(props.readOnly);

  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    /**
     * Read the API base off the page rather than hardcoding it. This install
     * serves Payload at `/payload-api`, not the default `/api`, and a
     * hardcoded default would 404 here while looking correct in review.
     */
    const apiBase =
      (typeof window !== "undefined" && (window as { __PAYLOAD_API__?: string }).__PAYLOAD_API__) ||
      "/payload-api";
    loadPeople(apiBase)
      .then((docs) => alive.current && setPeople(docs))
      .catch((e) => alive.current && setError(e instanceof Error ? e.message : "could not load people"));
    return () => {
      alive.current = false;
    };
  }, []);

  const selected = useMemo(() => {
    const ids = (Array.isArray(value) ? value : []).map(idOf).filter((x) => x != null);
    return new Set(ids.map(String));
  }, [value]);

  const toggle = (id: number | string) => {
    if (readOnly) return;
    const current = (Array.isArray(value) ? value : []).map(idOf).filter((x) => x != null) as (number | string)[];
    const has = current.some((c) => String(c) === String(id));
    setValue(has ? current.filter((c) => String(c) !== String(id)) : [...current, id]);
  };

  const { family, others, chosen } = useMemo(() => {
    const all = people ?? [];
    const needle = q.trim().toLowerCase();
    const match = (p: Person) =>
      !needle ||
      (p.name ?? "").toLowerCase().includes(needle) ||
      (p.role ?? "").toLowerCase().includes(needle);
    return {
      family: all.filter((p) => p.isFamily),
      others: all.filter((p) => !p.isFamily && match(p)),
      chosen: all.filter((p) => selected.has(String(p.id))),
    };
  }, [people, q, selected]);

  const Tile = ({ p, big = false }: { p: Person; big?: boolean }) => {
    const on = selected.has(String(p.id));
    const src = portraitOf(p);
    return (
      <button
        type="button"
        className={`pp-tile${big ? " pp-tile--big" : ""}${on ? " is-on" : ""}`}
        onClick={() => toggle(p.id)}
        aria-pressed={on}
        disabled={readOnly}
        title={p.role ? `${p.name} — ${p.role}` : p.name}
      >
        <span className="pp-face">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="pp-initials">{initials(p.name ?? "?")}</span>
          )}
          {on ? <span className="pp-check" aria-hidden="true">✓</span> : null}
        </span>
        <span className="pp-name">{p.name}</span>
        {/* Surfaced because this archive has a publication rule about it: a
            person marked as a child changes what may be published, and the
            editor tagging the photograph is the one who needs to know. */}
        {p.isMinor ? <span className="pp-minor">child</span> : null}
      </button>
    );
  };

  if (error) {
    return (
      <div className="pp-root">
        <div className="pp-error">
          Could not load people ({error}). The standard dropdown still works — reload the page.
        </div>
      </div>
    );
  }

  return (
    <div className="pp-root">
      <div className="pp-head">
        <span className="pp-legend">Who is in this collection</span>
        <span className="pp-count">{selected.size} tagged</span>
      </div>

      {people === null ? (
        <div className="pp-loading">Loading people…</div>
      ) : (
        <>
          {chosen.length ? (
            <div className="pp-chosen">
              {chosen.map((p) => (
                <button
                  key={`sel-${p.id}`}
                  type="button"
                  className="pp-chip"
                  onClick={() => toggle(p.id)}
                  disabled={readOnly}
                  title="Remove"
                >
                  {p.name}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}

          {family.length ? (
            <>
              <div className="pp-section">The family</div>
              <div className="pp-grid pp-grid--family">
                {family.map((p) => (
                  <Tile key={p.id} p={p} big />
                ))}
              </div>
            </>
          ) : null}

          <div className="pp-section pp-section--search">
            <span>Everyone else</span>
            <input
              className="pp-search"
              type="search"
              value={q}
              placeholder="Search by name or role…"
              onChange={(e) => setQ(e.target.value)}
              disabled={readOnly}
            />
          </div>

          {others.length ? (
            <div className="pp-grid">
              {others.map((p) => (
                <Tile key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="pp-empty">No one matches “{q}”.</div>
          )}
        </>
      )}
    </div>
  );
}

export default PeoplePicker;
