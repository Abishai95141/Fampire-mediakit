import type { AdminViewServerProps } from "payload";

import Link from "next/link";
import React from "react";

import "./Dashboard.css";

/**
 * What needs you today, instead of a grid of table names.
 *
 * Payload's dashboard lists every collection as a card. That is a directory,
 * and a directory answers "where is X" for somebody who already knows what
 * they came to do. It does not answer the question an editor actually opens
 * this with, which is "is anything waiting on me".
 *
 * Everything here is counted live from the database at request time. No
 * number is typed, cached or estimated — a dashboard that can be stale is
 * worse than none, because it is believed.
 *
 * ── The first row is the child-safety queue, deliberately ──────────────
 *
 * A collection featuring Love or Legend cannot publish until a named person
 * confirms it, and that queue was visible only by knowing to filter the
 * Collections list by two fields. The one rule this system enforces
 * absolutely had no surface anywhere. It is the first thing on the page now,
 * and it links straight to the filtered list.
 */

type Row = {
  label: string;
  count: number;
  href: string;
  hint: string;
  /** Draws attention only when there IS something. Zero is good news here. */
  urgent?: boolean;
};

const admin = (path: string) => `/admin${path}`;

export async function Dashboard(props: AdminViewServerProps) {
  const payload = props.initPageResult?.req?.payload;
  const user = props.initPageResult?.req?.user as { name?: string; email?: string } | undefined;

  // Without a payload instance there is nothing honest to show, so show the
  // frame and no numbers rather than zeros that look like facts.
  if (!payload) return <div className="fam-dash" />;

  const count = async (collection: string, where?: Record<string, unknown>) => {
    try {
      const r = await payload.count({ collection: collection as never, where: where as never });
      return r.totalDocs ?? 0;
    } catch {
      return -1; // unknown, and said so — never silently zero
    }
  };

  const [flagged, drafts, broken, unswept, collections, people, appearances] = await Promise.all([
    // Flagged as containing a child and not yet confirmed by a person.
    count("entries", { and: [{ containsMinor: { equals: true } }, { containsMinorConfirmed: { not_equals: true } }] }),
    count("entries", { _status: { equals: "draft" } }),
    count("entries", { linkStatus: { in: ["gone", "timeout", "blocked"] } }),
    count("entries", { lastChecked: { exists: false } }),
    count("entries"),
    count("people"),
    count("appearances"),
  ]);

  const waiting: Row[] = [
    {
      label: "awaiting child-safety sign-off",
      count: flagged,
      href: admin("/collections/entries?where[or][0][and][0][containsMinor][equals]=true"),
      hint: "Flagged because a child appears. Cannot publish until a person confirms each one.",
      urgent: true,
    },
    {
      label: "drafts not yet published",
      count: drafts,
      href: admin("/collections/entries?where[or][0][and][0][_status][equals]=draft"),
      hint: "Saved and private. Nothing here is on the public site.",
    },
    {
      label: "links the sweep found broken",
      count: broken,
      href: admin("/collections/entries"),
      hint: "This catalog is pointers at somebody else's storage, so a dead link is the failure mode.",
      urgent: true,
    },
  ];

  const nothingWaiting = waiting.every((r) => r.count === 0);

  return (
    <div className="fam-dash">
      <header className="fam-dash__head">
        <h1 className="fam-dash__title">
          {user?.name || user?.email ? `Hello, ${user.name || user.email}` : "The Media Center"}
        </h1>
        <p className="fam-dash__sub">
          The press room and living archive of The Lolli Family Institution. Everything on the
          public site is edited here.
        </p>
      </header>

      <section className="fam-dash__section">
        <h2 className="fam-dash__h2">Waiting on you</h2>
        {nothingWaiting ? (
          <p className="fam-dash__clear">Nothing is queued. The catalog is clear.</p>
        ) : (
          <ul className="fam-dash__rows">
            {waiting
              .filter((r) => r.count !== 0)
              .map((r) => (
                <li key={r.label} className={`fam-dash__row${r.urgent ? " is-urgent" : ""}`}>
                  <Link href={r.href} prefetch={false} className="fam-dash__rowlink">
                    <span className="fam-dash__n">{r.count < 0 ? "—" : r.count}</span>
                    <span className="fam-dash__rowtext">
                      <span className="fam-dash__rowlabel">{r.label}</span>
                      <span className="fam-dash__rowhint">{r.hint}</span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
        {unswept > 0 ? (
          <p className="fam-dash__note">
            {unswept} collections have never had their link checked. Run{" "}
            <code>npm run links:check</code> — &ldquo;unchecked&rdquo; is not the same as
            &ldquo;fine&rdquo;.
          </p>
        ) : null}
      </section>

      <section className="fam-dash__section">
        <h2 className="fam-dash__h2">Start here</h2>
        <div className="fam-dash__actions">
          <Link href={admin("/collections/entries/create")} prefetch={false} className="fam-dash__action">
            <b>Add a collection</b>
            <span>A title, one line, the link, and what kind it is. The rest can wait.</span>
          </Link>
          <Link href={admin("/collections/pages")} prefetch={false} className="fam-dash__action">
            <b>Edit a page</b>
            <span>Five public pages, each a stack of blocks you can reorder or replace.</span>
          </Link>
          <Link href={admin("/collections/appearances/create")} prefetch={false} className="fam-dash__action">
            <b>Log an appearance</b>
            <span>A podcast, an interview, a feature. It appears on Press immediately.</span>
          </Link>
        </div>
      </section>

      <section className="fam-dash__section">
        <h2 className="fam-dash__h2">What is in here</h2>
        <ul className="fam-dash__stats">
          <li>
            <Link href={admin("/collections/entries")} prefetch={false}>
              <b>{collections < 0 ? "—" : collections}</b> collections
            </Link>
          </li>
          <li>
            <Link href={admin("/collections/people")} prefetch={false}>
              <b>{people < 0 ? "—" : people}</b> people
            </Link>
          </li>
          <li>
            <Link href={admin("/collections/appearances")} prefetch={false}>
              <b>{appearances < 0 ? "—" : appearances}</b> press appearances
            </Link>
          </li>
        </ul>
      </section>

      {/* Stated once, where it will be read, rather than discovered when a
          save is refused and the reason is a validation error. */}
      <section className="fam-dash__section fam-dash__rules">
        <h2 className="fam-dash__h2">Two rules the system enforces for you</h2>
        <ol>
          <li>
            <b>A collection featuring a child cannot be published</b> until someone ticks
            &ldquo;contains minor &rarr; confirmed&rdquo;. Only an approver or an admin may tick
            it, and the save is refused otherwise.
          </li>
          <li>
            <b>TereZa always keeps her capital Z.</b> Rewritten on save, in titles, descriptions
            and alt text, so a hand edit cannot undo it.
          </li>
        </ol>
      </section>
    </div>
  );
}

export default Dashboard;
