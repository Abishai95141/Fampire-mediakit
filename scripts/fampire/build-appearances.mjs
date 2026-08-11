/**
 * Extracts the podcast / press appearance log from the client's media-kit page
 * into data/fampire/appearances.json.
 *
 * The source is a flat run of lines on a Wix page:
 *
 *     [[Show name -> url]]
 *     with Host Name            (sometimes absent)
 *     - Aired: June 5, 2025
 *     Views: 38,000 (as of March 3, 2025)   (often just ".")
 *
 * Kept as a generated file rather than hand-typed so that re-running against a
 * fresh capture of the page picks up new appearances without anyone editing a
 * TypeScript array. Every field is theirs; nothing is inferred.
 *
 * Run: node scripts/fampire/build-appearances.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const text = readFileSync(`${ROOT}/data/fampire/sources/media-kit-page-copy.txt`, "utf8");

const lines = text.split("\n");
const start = lines.findIndex((l) => l.trim() === "PODCAST APPEARANCES");
const end = lines.findIndex((l, i) => i > start && l.includes("BIOHACK YOURSELF PHOTO GALLERY"));
if (start < 0 || end < 0) {
  console.error("Could not locate the PODCAST APPEARANCES block — did the page change?");
  process.exit(1);
}

const block = lines.slice(start + 1, end);
const LINK_G = /\[\[([^\]]*?)\s*->\s*([^\]]*?)\]\]/g;

const out = [];
let current = null;

const flush = () => {
  if (current?.title && current.url) out.push(current);
  current = null;
};

/** "- Aired: June 5, 2025" wherever it appears — inline or on its own line. */
function takeAired(target, s) {
  const m = /Aired:\s*([^.]+?)\s*$/i.exec(s);
  if (m) target.aired = m[1].trim();
  return Boolean(m);
}

for (const raw of block) {
  const line = raw.trim();
  if (!line || line === ".") continue;

  LINK_G.lastIndex = 0;
  const links = [...line.matchAll(LINK_G)].map((m) => ({
    label: m[1].replace(/\s+/g, " ").trim(),
    url: m[2].trim(),
  }));
  const lead = links.length ? line.slice(0, line.indexOf("[[")).trim() : line;

  if (links.length) {
    // Three shapes appear in the source, and telling them apart is the whole
    // job here:
    //
    //   [[Show name -> url]]                       a new appearance
    //   [[with Host - Aired: 2 Feb 2025 -> url]]   a credit for the one above,
    //                                              which happens to be linked
    //   Show name - [[Part 1 -> u]] & [[Part 2 -> u]]
    //                                              a new multi-part appearance
    //
    // Treating shape two as a new row is what silently swallowed the row above
    // it and stole its view count.
    const isCredit = !lead && /^with\s+/i.test(links[0].label);

    if (isCredit && current) {
      const credit = links[0].label;
      current.host = credit
        .replace(/^with\s+/i, "")
        .replace(/[-–—]?\s*Aired:.*$/i, "")
        .trim() || null;
      takeAired(current, credit);
      continue;
    }

    const isParts = Boolean(lead) && links.every((l) => /^part\s*\d/i.test(l.label));

    flush();
    current = {
      title: (isParts ? lead : links[0].label).replace(/[-–—\s]+$/, "").trim(),
      url: links[0].url,
      host: null,
      aired: null,
      views: null,
      // Multi-part appearances are one show, not two rows.
      parts: isParts ? links : [],
    };
    if (isParts) {
      const withHost = /with\s+(.+)$/i.exec(current.title);
      if (withHost) {
        current.host = withHost[1].trim();
        current.title = current.title.slice(0, withHost.index).replace(/[-–—\s]+$/, "").trim();
      }
    }
    continue;
  }

  if (!current) continue;

  if (/^with\s+/i.test(line)) {
    current.host = line
      .replace(/^with\s+/i, "")
      .replace(/[-–—]?\s*Aired:.*$/i, "")
      .replace(/[-–—\s]+$/, "")
      .trim() || null;
    takeAired(current, line);
    continue;
  }
  if (/Aired:/i.test(line)) {
    takeAired(current, line);
    continue;
  }
  const views = /^Views:\s*([\d,]+)/i.exec(line);
  if (views) {
    current.views = Number(views[1].replace(/,/g, ""));
    const asOf = /\(([^)]*)\)/.exec(line);
    current.views_as_of = asOf ? asOf[1].trim() : null;
  }
}
flush();

// Some rows carry the host inside the title ("... with Jarek Tadla"); leave
// them as written rather than splitting and risking a mangled show name.
const withDates = out.filter((a) => a.aired).length;
const withViews = out.filter((a) => a.views).length;

writeFileSync(
  `${ROOT}/data/fampire/appearances.json`,
  `${JSON.stringify({ appearances: out }, null, 2)}\n`,
);

console.log(
  `appearances.json — ${out.length} appearances, ${withDates} dated, ${withViews} with view counts`,
);
