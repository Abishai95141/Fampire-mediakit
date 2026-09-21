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
 * worse than none, because it is believed. A count that throws renders as an
 * em dash rather than a zero, for the same reason.
 *
 * ── The first card is the child-safety queue, deliberately ────────────
 *
 * A collection featuring Love or Legend cannot publish until a named person
 * confirms it, and that queue was visible only by knowing to filter the
 * Collections list by two fields. The one rule this system enforces
 * absolutely had no surface anywhere. It is the first thing on the page now,
 * and it links straight to the filtered list.
 */

const admin = (path: string) => `/admin${path}`;

/** Server-rendered, so this is the server's clock — which is the one the
 *  editor's working day runs on when the team is in one place. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const PATHS = {
  collections: "M8 3h9a2 2 0 0 1 2 2v12M5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z",
  people: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 8v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3",
  hourglass: "M6 2h12M6 22h12M8 2v4.5a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5V2M8 22v-4.5a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V22",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  warning: "M12 9v4m0 4h.01M10.3 3.9 2.4 17.1A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  plus: "M12 5v14M5 12h14",
  page: "M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Zm0 0v5h5",
  arrow: "M5 12h14m-6-6 6 6-6 6",
};

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
      return -1;
    }
  };

  const [flagged, drafts, broken, unswept, collections, people, appearances] = await Promise.all([
    count("entries", { and: [{ containsMinor: { equals: true } }, { containsMinorConfirmed: { not_equals: true } }] }),
    count("entries", { _status: { equals: "draft" } }),
    count("entries", { linkStatus: { in: ["gone", "timeout", "blocked"] } }),
    count("entries", { lastChecked: { exists: false } }),
    count("entries"),
    count("people"),
    count("appearances"),
  ]);

  const n = (v: number) => (v < 0 ? "—" : String(v));

  const queue = [
    {
      key: "safety",
      count: flagged,
      label: "awaiting child-safety sign-off",
      hint: "Flagged because a child appears. Cannot publish until a person confirms each one.",
      pill: "Needs review",
      pillTone: "urgent" as const,
      action: "Review",
      href: admin("/collections/entries?where[or][0][and][0][containsMinor][equals]=true"),
      primary: true,
    },
    {
      key: "drafts",
      count: drafts,
      label: "drafts not yet published",
      hint: "Saved and private. Nothing here is on the public site.",
      pill: "Draft",
      pillTone: "quiet" as const,
      action: "View drafts",
      href: admin("/collections/entries?where[or][0][and][0][_status][equals]=draft"),
      primary: false,
    },
    {
      key: "links",
      count: broken,
      label: "links the sweep found broken",
      hint: "This catalog is pointers at somebody else's storage, so a dead link is the failure mode.",
      pill: "Broken",
      pillTone: "urgent" as const,
      action: "Inspect",
      href: admin("/collections/entries"),
      primary: false,
    },
  ].filter((r) => r.count !== 0);

  return (
    <div className="fam-dash">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <header className="fam-dash__hero">
        <div className="fam-dash__heroText">
          <p className="fam-dash__eyebrow">Overview</p>
          <h1 className="fam-dash__greeting">{greeting()}</h1>
          <p className="fam-dash__sub">
            The press room and living archive of The Lolli Family Institution.
            <br />
            Everything on the public site is edited here.
          </p>
          {user?.name || user?.email ? (
            <p className="fam-dash__who">{user.name || user.email}</p>
          ) : null}
        </div>

        {/* The panel is a gradient with the image ON it, not inside it, so a
            missing file leaves a designed surface rather than a hole. The
            public folder is not copied into a standalone build, which is
            exactly how the landing photograph broke once before. */}
        <div className="fam-dash__heroArt" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/lolli-family-cannes-900x435.jpg" alt="" loading="lazy" />
          <span className="fam-dash__heroRule" />
        </div>
        <p className="fam-dash__heroMotto" aria-hidden="true">
          People
          <br />
          Stories
          <br />
          A lasting record
        </p>
      </header>

      {/* ── The three totals ─────────────────────────────────────────── */}
      <ul className="fam-dash__totals">
        {[
          { icon: PATHS.collections, value: collections, label: "Collections", href: admin("/collections/entries") },
          { icon: PATHS.people, value: people, label: "People", href: admin("/collections/people") },
          { icon: PATHS.mic, value: appearances, label: "Press appearances", href: admin("/collections/appearances") },
        ].map((t) => (
          <li key={t.label}>
            <Link href={t.href} prefetch={false}>
              <Icon d={t.icon} className="fam-dash__totalIcon" />
              <span>
                <b>{n(t.value)}</b>
                <span className="fam-dash__totalLabel">{t.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="fam-dash__grid">
        {/* ── Waiting on you ─────────────────────────────────────────── */}
        <section className="fam-dash__card">
          <div className="fam-dash__cardHead">
            <Icon d={PATHS.hourglass} className="fam-dash__cardIcon" />
            <div>
              <h2>Waiting on you</h2>
              <p>Items that need your review or action.</p>
            </div>
            <Link href={admin("/collections/entries")} prefetch={false} className="fam-dash__viewall">
              View all <Icon d={PATHS.arrow} className="fam-dash__inlineArrow" />
            </Link>
          </div>

          {queue.length === 0 ? (
            <p className="fam-dash__clear">Nothing is queued. The catalog is clear.</p>
          ) : (
            <ul className="fam-dash__queue">
              {queue.map((r) => (
                <li key={r.key} className="fam-dash__item">
                  <span className="fam-dash__itemN">{n(r.count)}</span>
                  <span className="fam-dash__itemText">
                    <span className="fam-dash__itemLabel">{r.label}</span>
                    <span className="fam-dash__itemHint">{r.hint}</span>
                  </span>
                  <span className={`fam-dash__pill fam-dash__pill--${r.pillTone}`}>{r.pill}</span>
                  <Link
                    href={r.href}
                    prefetch={false}
                    className={`fam-dash__btn${r.primary ? " fam-dash__btn--primary" : ""}`}
                  >
                    {r.action} <Icon d={PATHS.arrow} className="fam-dash__inlineArrow" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── System health ──────────────────────────────────────────── */}
        <section className="fam-dash__card">
          <div className="fam-dash__cardHead">
            <Icon d={PATHS.shield} className="fam-dash__cardIcon" />
            <div>
              <h2>System health</h2>
              <p>Keep things in good shape.</p>
            </div>
          </div>

          {unswept > 0 ? (
            <div className="fam-dash__alert">
              <Icon d={PATHS.warning} className="fam-dash__alertIcon" />
              <div>
                <p className="fam-dash__alertTitle">
                  {n(unswept)} collections have never had their link checked.
                </p>
                <p className="fam-dash__alertBody">
                  Run <code>npm run links:check</code> — &ldquo;unchecked&rdquo; is not the same as
                  &ldquo;fine&rdquo;.
                </p>
              </div>
            </div>
          ) : (
            <p className="fam-dash__clear">Every link has been checked.</p>
          )}
        </section>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <section className="fam-dash__card fam-dash__quick">
        <div className="fam-dash__quickHead">
          <Icon d={PATHS.bolt} className="fam-dash__cardIcon" />
          <div>
            <h2>Quick actions</h2>
            <p>Common tasks, all in one place.</p>
          </div>
        </div>
        <div className="fam-dash__quickList">
          {[
            {
              icon: PATHS.plus,
              title: "Add a collection",
              body: "A title, one line, the link, and what kind it is. The rest can wait.",
              href: admin("/collections/entries/create"),
            },
            {
              icon: PATHS.page,
              title: "Edit a page",
              body: "Five public pages, each a stack of blocks you can reorder or replace.",
              href: admin("/collections/pages"),
            },
            {
              icon: PATHS.mic,
              title: "Log an appearance",
              body: "A podcast, an interview, a feature. It appears on Press immediately.",
              href: admin("/collections/appearances/create"),
            },
          ].map((a) => (
            <Link key={a.title} href={a.href} prefetch={false} className="fam-dash__quickItem">
              <span className="fam-dash__quickIcon">
                <Icon d={a.icon} />
              </span>
              <span className="fam-dash__quickText">
                <b>
                  {a.title}
                  <Icon d={PATHS.arrow} className="fam-dash__quickArrow" />
                </b>
                <span>{a.body}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
