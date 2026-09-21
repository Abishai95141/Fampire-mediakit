"use client";

import type { DefaultCellComponentProps } from "payload";

import React from "react";

import "./TitleCell.css";

/**
 * A row you can recognise: the frame, the title, and whether it is public.
 *
 * Six hundred collections read as one flat crowd of text. The title column
 * carried a link and nothing else, so telling "A4M Red Carpet — Interviews"
 * from "A4M Red Carpet — BTS" meant reading to the end of both, and whether
 * either was actually published meant looking across at another column.
 *
 * ── Why a Cell and not a custom list view ─────────────────────────────
 *
 * Replacing `views.list` means reimplementing search, filters, sorting,
 * pagination, selection and bulk actions — and then maintaining all of it
 * against Payload's own. This changes one column. Everything else in that
 * list keeps working because nothing else was touched, including the search
 * across `rawFolderName` that the media team actually relies on.
 *
 * ── The picture ───────────────────────────────────────────────────────
 *
 * The list query runs at depth 0, so an upload relationship arrives as a bare
 * id and cannot be resolved here. `previewUrl` is a text field and is present;
 * `previewFileId` is the Drive id the sampler wrote. Those are the same two
 * the public cards fall back through, in the same order, so a row looks here
 * like it looks there.
 *
 * A collection with neither renders an empty frame rather than a broken
 * image — 138 of them had no sampled frame at one point, and a column of
 * broken-image glyphs is worse than a column of blanks.
 */

type Row = {
  _status?: string;
  previewUrl?: string | null;
  previewFileId?: string | null;
  kind?: string | null;
  containsMinor?: boolean | null;
  containsMinorConfirmed?: boolean | null;
};

const thumb = (row: Row): string | null => {
  const direct = typeof row.previewUrl === "string" ? row.previewUrl.trim() : "";
  if (direct) return direct;
  const id = typeof row.previewFileId === "string" ? row.previewFileId.trim() : "";
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w200` : null;
};

export function TitleCell(props: DefaultCellComponentProps) {
  const row = (props.rowData ?? {}) as Row;
  const title = typeof props.cellData === "string" && props.cellData.trim() ? props.cellData : "Untitled";
  const src = thumb(row);

  /**
   * Held is not the same as draft.
   *
   * A draft is unfinished. A held collection is finished and REFUSED — it
   * features a child and no person has confirmed it, so the system will not
   * publish it however many times you press the button. Showing both as
   * "Draft" is what made that queue invisible.
   */
  const held = Boolean(row.containsMinor) && !row.containsMinorConfirmed;
  const published = row._status === "published";

  return (
    <span className="fam-cell">
      <span className="fam-cell__frame" aria-hidden="true">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" draggable={false} />
        ) : null}
      </span>
      <span className="fam-cell__text">
        <span className="fam-cell__title">{title}</span>
        <span className="fam-cell__meta">
          {held ? (
            <span className="fam-cell__pill fam-cell__pill--held">held for sign-off</span>
          ) : published ? (
            <span className="fam-cell__pill fam-cell__pill--live">public</span>
          ) : (
            <span className="fam-cell__pill fam-cell__pill--draft">draft</span>
          )}
          {row.kind ? <span className="fam-cell__kind">{row.kind}</span> : null}
        </span>
      </span>
    </span>
  );
}

export default TitleCell;
