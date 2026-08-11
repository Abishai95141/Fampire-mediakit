/**
 * FAMPIRE catalog builder.
 *
 * The FAMPIRE Media Center is a CATALOG OVER EXISTING STORAGE, not a DAM.
 * We never host, copy or migrate a file. Every entry below is a *description*
 * plus a pointer at something that already lives in the client's Google Drive,
 * Dropbox, Pic-Time, Vimeo or on their own sites.
 *
 * Provenance — everything here is joined against real, captured source data in
 * data/fampire/sources/:
 *   broll-asset-library-links.json  the client's B-Roll Asset Library doc
 *                                   (name -> URL, 261 links)
 *   media-kit-page-links.json       biohackyourself.com/media-kit-press-materials
 *   media-kit-page-copy.txt         that page's copy — synopses, awards, dates
 *   opengraph.json                  og:title/description/image per public page
 *
 * The curated table is the human layer: the *renaming for strangers* that §4.5
 * of the build plan calls "the product". `CARD 1` and `Dump 1` never reach a
 * reader. Everything else — platform, access, year, minor-flag draft — is
 * derived below so it stays consistent as the table grows.
 *
 * Run: node scripts/fampire/build-catalog.mjs
 * Out: data/fampire/catalog.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = `${ROOT}/data/fampire/sources`;

const read = (f) => JSON.parse(readFileSync(`${SRC}/${f}`, "utf8"));

/** name -> url, first occurrence wins (the doc repeats links in nav blocks). */
function index(rows) {
  const m = new Map();
  for (const r of rows) if (r.txt && r.href && !m.has(r.txt)) m.set(r.txt, r.href);
  return m;
}

const broll = index(read("broll-asset-library-links.json"));
const mediakit = index(read("media-kit-page-links.json"));
const ogRows = read("opengraph.json");
const og = new Map(ogRows.map((r) => [r.url, r]));

/**
 * Several of the client's pages fall back to one site-wide og:image. Reusing
 * that as if it were a portrait of Anthony, then of TereZa, then of a film
 * would be a caption that lies. "Real photography only" has to mean we know
 * what the photograph IS — so any image that turns up on more than two pages
 * is treated as chrome and dropped, and those entries render as type instead.
 */
const imageUses = new Map();
for (const r of ogRows) {
  if (!r.image) continue;
  const key = r.image.split("/v1/")[0];
  imageUses.set(key, (imageUses.get(key) ?? 0) + 1);
}
function pageSpecificImage(row) {
  if (!row?.image) return null;
  return imageUses.get(row.image.split("/v1/")[0]) > 2 ? null : row.image;
}

const missing = [];
/** Look a link up by its exact anchor text in the client's own index. */
function link(name, { from = "broll" } = {}) {
  const url = (from === "broll" ? broll : mediakit).get(name);
  if (!url) missing.push(`${from}:${name}`);
  return url ?? null;
}

// ── Derivation ──────────────────────────────────────────────────────────

/**
 * Google Drive `/drive/u/1/folders/<id>` URLs are account-INDEX scoped: they
 * open "the second Google account signed into this browser", which for anyone
 * but the client is the wrong account or an error page. The folder id is what
 * actually identifies the resource, so we rewrite to the portable form and keep
 * the original for the audit trail. Same for the legacy `/open?id=` shape.
 */
function normalizeUrl(raw) {
  if (!raw) return { url: null, rewritten_from: null };
  let url = raw;

  const uScoped = /^https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([^?#]+)/.exec(url);
  if (uScoped) url = `https://drive.google.com/drive/folders/${uScoped[1]}`;

  const openId = /^https:\/\/drive\.google\.com\/open\?id=([^&#]+)/.exec(url);
  if (openId) url = `https://drive.google.com/drive/folders/${openId[1]}`;

  // Tracking/nav cruft that does not identify the resource.
  url = url.replace(/[?&](usp|st|e|subfolder_nav_tracking|share|srsltid)=[^&#]*/g, (m, k) =>
    k === "rlkey" || k === "dl" ? m : "",
  );
  url = url.replace(/\?&/, "?").replace(/[?&]$/, "");

  return { url, rewritten_from: url === raw ? null : raw };
}

function platformOf(url) {
  if (!url) return "unknown";
  const h = new URL(url).hostname;
  if (h.endsWith("drive.google.com")) return "drive";
  if (h.endsWith("docs.google.com")) return "drive";
  if (h.endsWith("dropbox.com")) return "dropbox";
  if (h.includes("pic-time.com")) return "pictime";
  if (h.endsWith("vimeo.com")) return "vimeo";
  if (h.endsWith("youtube.com") || h === "youtu.be") return "youtube";
  if (
    h.includes("tubitv") || h.includes("roku") || h.includes("plex") ||
    h.includes("amazon") || h.includes("apple") || h.includes("fawesome") ||
    h.includes("hoopla") || h.includes("fubo") || h.includes("truthsocial") ||
    h.includes("rapido") || h.includes("play.google")
  ) return "streaming";
  return "site";
}

/**
 * Access defaults, per platform reality measured against the sources:
 *  - Dropbox `/home/` paths resolve only for the account owner — they are dead
 *    links for everyone else and must never publish as if they work.
 *  - The Pic-Time `/client` and `/portfolio` roots are pass-protected; the
 *    per-event `/<slug>/gallery` links are open.
 *  - Vimeo hosts the full documentary parts behind passwords, held by the
 *    client (redacted from the committed source capture).
 * An explicit `access` on an entry always wins.
 */
function deriveAccess(url, platform) {
  if (!url) return "broken";
  if (platform === "dropbox" && url.includes("/home/")) return "broken";
  if (platform === "pictime" && /\/(client|portfolio)\b/.test(url)) return "password";
  if (platform === "vimeo") return "password";
  return "public";
}

const MINORS = new Set(["love", "legend"]);

// ── The curated table ───────────────────────────────────────────────────
// title      what a stranger should see. Never the client's folder name.
// name       the anchor text to resolve in the client's own index.
// from       which index to resolve against ("broll" default, or "mediakit").
// url        use instead of name, when the link is a plain URL in the source.
// private    force behind FAMPIRE login regardless of derived access.
//
// `contains_minor` is DRAFTED here, never decided. Every true value is a flag
// for a human to confirm before publish (build plan §9, hard stop 1).

const ENTRIES = [
  // ── Brand ────────────────────────────────────────────────────────────
  {
    id: "brand-logos-registered",
    title: "Biohack Yourself — Logo Suite & Registered Mark",
    description:
      "The primary logo set including the ® registered treatment. Use these before pulling a logo off a screenshot.",
    name: "Symbol Logo", kind: "logo", subjects: [], brands: ["biohack-yourself"], year: null,
  },
  {
    id: "brand-plus-logos",
    title: "Biohack Yourself+ — Logo Variants",
    description: "Logo variants for the Biohack Yourself+ streaming identity.",
    name: "Plus Logos", kind: "logo", subjects: [], brands: ["biohack-yourself"], year: null,
  },
  {
    id: "brand-lolli-logos",
    title: "Lolli Brands Entertainment — Logos",
    description: "The production company's logotype pack, for credits and end cards.",
    name: "Logos", from: "mediakit", kind: "logo", subjects: [], brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-lower-third",
    title: "Broadcast Lower Third — Master Files",
    description: "The on-screen name strap used across interviews and event coverage.",
    name: "Lower Third", kind: "b-roll", subjects: [], brands: ["biohack-yourself"], year: null,
  },
  {
    id: "brand-intro-30s",
    title: "Lolli Brands — 30-Second Logo Intro",
    description:
      "The full animated logo intro, 30 seconds, delivered as a single MP4. Front any cut with this.",
    name: "Intro", from: "mediakit", kind: "trailer", subjects: [], brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-bts-lolli",
    title: "Lolli Brands — Behind the Scenes",
    description: "Production stills and footage from across the Lolli Brands slate.",
    name: "Behind The Scenes", from: "mediakit", kind: "BTS", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-celebrity-cast",
    title: "The Lollis with Celebrity Cast",
    description: "Anthony and TereZa photographed alongside the cast and contributors of the slate.",
    name: "Celebrity Cast", from: "mediakit", kind: "event photography",
    subjects: ["anthony", "tereza"], brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-doc-covers-all",
    title: "All Documentary Covers — Clean, No Award Laurels",
    description:
      "Every film's key art without laurels burned in. This is the version you want for a layout.",
    name: "All Documentary covers no awards", kind: "poster", subjects: [],
    brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-doc-covers-awards",
    title: "All Documentary Covers — With Award Laurels",
    description: "The same key art carrying festival laurels, for press and festival submissions.",
    name: "Documentary Covers with awards", kind: "poster", subjects: [],
    brands: ["lolli-brands"], year: null,
  },
  {
    id: "brand-doc-collage",
    title: "Documentary Slate — Collage",
    description: "A single composed image of the full slate, for one-slide summaries.",
    name: "Documentaries Collage", kind: "poster", subjects: [], brands: ["lolli-brands"], year: null,
  },

  // ── People ───────────────────────────────────────────────────────────
  {
    id: "person-anthony-bio",
    title: "Anthony Lolli — Bio & Headshots",
    description:
      "Approved biography and press headshots. Real estate founder, author of The Heart of the Deal, subject of the 125-pound transformation.",
    name: "Bio & Headshots", from: "mediakit", kind: "headshots", subjects: ["anthony"],
    brands: ["lolli-brands"], year: null, ogKey: "https://www.lollibrands.com/anthony",
  },
  {
    id: "person-tereza-bio",
    title: "TereZa Hakobyan-Lolli — Bio & Headshots",
    description:
      "Approved biography and press headshots. Armenian-born actress, recording artist and editor-in-chief; two bikini world titles.",
    url: broll.get("__none__") ?? null,
    name: null,
    explicitUrl: "https://drive.google.com/drive/folders/1Mzhq1aiZ1eR8CJaFdfNJGpob2S5ehA_s",
    kind: "headshots", subjects: ["tereza"], brands: ["lolli-brands"], year: null,
    ogKey: "https://www.lollibrands.com/tereza",
  },
  {
    id: "person-love-legend-bio",
    title: "Love & Legend Lolli — Bio & Headshots",
    description:
      "Approved biography and press headshots for both children, as published by the family's own media kit.",
    explicitUrl: "https://drive.google.com/drive/folders/1OU4UBaUC8_wBhlwlloCJXRXTqCQ12N2t",
    kind: "headshots", subjects: ["love", "legend"], brands: ["lolli-brands"], year: null,
    ogKey: "https://www.lollibrands.com/love-and-legend",
  },
  {
    id: "person-tereza-headshot-single",
    title: "TereZa Hakobyan-Lolli — Single Press Headshot",
    description: "One approved headshot as a direct file, when a folder is more than you need.",
    name: "TereZa headshot", kind: "headshots", subjects: ["tereza"], brands: ["lolli-brands"], year: null,
  },
  {
    id: "person-legend-headshots",
    title: "Legend Lolli — Headshots",
    description: "Headshot set for Legend Lolli.",
    name: "Legend Headshots", kind: "headshots", subjects: ["legend"], brands: ["lolli-brands"],
    year: null, private: true,
  },
  {
    id: "person-love-legend-headshots",
    title: "Love & Legend Lolli — Headshot Set",
    description: "The full headshot set for both children.",
    name: "Love and Legend HeadShots", kind: "headshots", subjects: ["love", "legend"],
    brands: ["lolli-brands"], year: null, private: true,
  },
  {
    id: "person-anthony-master",
    title: "Anthony Lolli — Master Archive",
    description: "The complete Anthony Lolli photo and video archive across every production.",
    name: "ANTHONY MASTER FOLDER", kind: "b-roll", subjects: ["anthony"],
    brands: ["lolli-brands"], year: null,
  },
  {
    id: "family-photoshoots",
    title: "Lolli Family — Studio Photoshoots",
    description: "Formal family portrait sessions, all four family members.",
    name: "Family Photoshoots", kind: "event photography",
    subjects: ["anthony", "tereza", "love", "legend"], brands: ["lolli-brands"], year: null,
  },
  {
    id: "family-mansion",
    title: "The Lolli Residence — Location Photography",
    description: "The family home as a location: interiors, exteriors, lifestyle setups.",
    name: "Lolli Mansion", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], year: null,
  },
  {
    id: "family-engagement",
    title: "Anthony & TereZa — Engagement Photography",
    description: "The engagement shoot, used widely in profile pieces about the couple.",
    name: "Anthony and TereZa Engagement photos", kind: "event photography",
    subjects: ["anthony", "tereza"], brands: ["lolli-brands"], year: null,
  },
  {
    id: "bodybuilding-stage",
    title: "Competition Stage — Photography",
    description:
      "Anthony and TereZa on the bodybuilding competition stage. The end point of the transformation arc.",
    name: "Competition Stage photos", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], year: null,
  },

  // ── Films ────────────────────────────────────────────────────────────
  {
    id: "film-biohack-yourself-master",
    title: "Biohack Yourself — Master Asset Folder",
    description:
      "Everything for the five-part flagship: stills, footage, deliverables. Part two of the archive is a separate entry.",
    name: "BIOHACK YOURSELF MASTER FOLDER", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
    ogKey: "https://www.lollibrands.com/biohack-yourself",
  },
  {
    id: "film-biohack-yourself-master-2",
    title: "Biohack Yourself — Master Asset Folder, Part 2",
    description: "The overflow archive for the flagship documentary.",
    name: "MASTER FOLDER PART 2", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
  },
  {
    id: "film-biohack-yourself-trailer",
    title: "Biohack Yourself — Directors Trailer",
    description:
      "The official directors trailer, streamable and embeddable. The clip to lead a segment with.",
    explicitUrl: "https://vimeo.com/1025829605", kind: "trailer",
    subjects: ["anthony", "tereza"], brands: ["biohack-yourself"], film: "Biohack Yourself",
    year: 2024, access: "public",
  },
  {
    id: "film-biohack-yourself-full-parts",
    title: "Biohack Yourself — Full Documentary, Parts 1–5",
    description:
      "The complete five-part film on Vimeo. Password-gated per part; credentials are held by the media team.",
    explicitUrl: "https://vimeo.com/1063248555", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024, private: true,
    alternates: [
      "https://vimeo.com/1063259372",
      "https://vimeo.com/1063467641",
      "https://vimeo.com/1063267440",
      "https://vimeo.com/1063238024",
    ],
  },
  {
    id: "film-biohack-yourself-covers",
    title: "Biohack Yourself — Official Covers",
    description: "Key art and cover treatments for the flagship documentary.",
    name: "Official Covers", from: "mediakit", kind: "poster", subjects: [],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
  },
  {
    id: "film-biohack-yourself-logos",
    title: "Biohack Yourself — Documentary Logos",
    description: "Title treatments and film logos for the flagship documentary.",
    name: "Documentary Logos", from: "mediakit", kind: "logo", subjects: [],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
  },
  {
    id: "film-biohack-yourself-cast-headshots",
    title: "Biohack Yourself — Full Cast Headshots",
    description: "Headshots for the complete documentary cast, including the physician contributors.",
    name: "Cast Headshots", from: "mediakit", kind: "headshots", subjects: [],
    brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
  },
  {
    id: "film-biohack-yourself-onset",
    title: "Biohack Yourself — Full Cast On Set",
    description: "On-set photography of the complete cast during production.",
    name: "On-Set", from: "mediakit", kind: "BTS", subjects: [], brands: ["biohack-yourself"],
    film: "Biohack Yourself", year: 2024,
  },
  {
    id: "film-biohack-yourself-bts",
    title: "Biohack Yourself — BTS Stills & Video",
    description: "Behind-the-scenes stills and footage from the flagship shoot.",
    name: "BiohackYourself &ndash; BTS pics and video", kind: "BTS",
    subjects: ["anthony", "tereza"], brands: ["biohack-yourself"], film: "Biohack Yourself", year: 2024,
  },

  {
    id: "film-fat-lolli-master",
    title: "From Fat Lolli to 6 Pack Lolli — Master Asset Folder",
    description:
      "The complete archive for the transformation documentary. Four Best Documentary awards.",
    name: "FAT LOLLI TO 6 PACK LOLLI MASTER FOLDER", kind: "b-roll", subjects: ["anthony"],
    brands: ["lolli-brands"], film: "From Fat Lolli to 6 Pack Lolli", year: 2020,
    ogKey: "https://www.lollibrands.com/from-fat-lolli-to-6-pack-lolli",
  },
  {
    id: "film-fat-lolli-trailer",
    title: "From Fat Lolli to 6 Pack Lolli — Official Trailer",
    description: "Downloadable MP4 of the official trailer.",
    explicitUrl:
      "https://www.dropbox.com/scl/fi/ir8xi2jb50i9ia8kgf1xi/FROM-FAT-LOLLI-TO-6-PACK-LOLLI-_-Official-Trailer.mp4?rlkey=zs5jz1qzbzfcntwiji5sr2dpc&dl=0",
    kind: "trailer", subjects: ["anthony"], brands: ["lolli-brands"],
    film: "From Fat Lolli to 6 Pack Lolli", year: 2020,
  },
  {
    id: "film-fat-lolli-photos",
    title: "From Fat Lolli to 6 Pack Lolli — Photo Archive",
    description: "Documentary photography: early struggle through peak conditioning.",
    explicitUrl:
      "https://www.dropbox.com/scl/fo/9m5wcup2h4e5cdm9ufa0s/ADB8kRCFhrXWqnyo8VnyQxM?rlkey=vmdqhpe55m0obstvnw0uwpkvc&dl=0",
    kind: "event photography", subjects: ["anthony"], brands: ["lolli-brands"],
    film: "From Fat Lolli to 6 Pack Lolli", year: 2020,
  },

  {
    // Per-film cover art. Resolved by explicit URL rather than by anchor text
    // because the media-kit page reuses the label "Documentary Covers" for
    // every film, so a name lookup would hand all four the same folder.
    id: "film-fat-lolli-covers",
    title: "From Fat Lolli to 6 Pack Lolli — Documentary Covers",
    description: "Key art and cover treatments for the transformation documentary.",
    explicitUrl: "https://drive.google.com/drive/folders/1GORHfrKxFrsBzHkKE9qN6kRPAuDw_H9h",
    kind: "poster", subjects: ["anthony"], brands: ["lolli-brands"],
    film: "From Fat Lolli to 6 Pack Lolli", year: 2020,
  },
  {
    id: "film-super-lollis-master",
    title: "The Super Lollis — Master Asset Folder",
    description: "The complete archive for the six-episode series. Thirteen Best Documentary awards.",
    name: "SUPER LOLLIS MASTER FOLDER", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], film: "The Super Lollis", year: 2022,
    ogKey: "https://www.lollibrands.com/super-lollis",
  },
  {
    id: "film-super-lollis-trailer",
    title: "The Super Lollis — Official Trailer",
    description: "Downloadable MP4 of the official trailer.",
    explicitUrl:
      "https://www.dropbox.com/scl/fi/nqrlkfzkz6571l0h4us4i/THE-SUPER-LOLLIES-_-Official-Trailer.mp4?rlkey=49xg46rn7zlf11wliybo7k8tp&dl=0",
    kind: "trailer", subjects: ["anthony", "tereza"], brands: ["lolli-brands"],
    film: "The Super Lollis", year: 2022,
  },
  {
    id: "film-super-lollis-podcast",
    title: "The Super Lollis — Podcast Archive",
    description: "The companion podcast archive for the series.",
    name: "SUPER LOLLIS PODCAST", kind: "podcast", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], film: "The Super Lollis", year: 2022,
  },

  {
    id: "film-super-lollis-covers",
    title: "The Super Lollis — Documentary Covers",
    description: "Key art and cover treatments for the six-episode series.",
    explicitUrl: "https://drive.google.com/drive/folders/1XgPQvkxGoRvWt8Mc4Nqj4ogLKsR1TyhA",
    kind: "poster", subjects: [], brands: ["lolli-brands"],
    film: "The Super Lollis", year: 2022,
  },
  {
    id: "film-skin-deep-covers",
    title: "Skin Deep — Documentary Covers",
    description: "Key art and cover treatments for Skin Deep.",
    explicitUrl: "https://drive.google.com/drive/folders/1A5ZfXUO6c-EMxHQooUbAWNCd75NqPeBd",
    kind: "poster", subjects: [], brands: ["lolli-brands"],
    film: "Skin Deep", year: 2023,
  },
  {
    id: "film-guru-covers",
    title: "The Guru — Documentary Covers",
    description: "Key art and cover treatments for the most decorated film on the slate.",
    explicitUrl: "https://drive.google.com/drive/folders/1YnwKBQtCbqUpzh888Eg5sjxPKZBjWi3x",
    kind: "poster", subjects: [], brands: ["lolli-brands"],
    film: "The Guru", year: 2024,
  },
  {
    id: "film-skin-deep-master",
    title: "Skin Deep — Master Asset Folder",
    description:
      "The complete archive for Alex Porro's story: 300 pounds lost, then twenty pounds of loose skin removed. Thirteen Best Documentary awards.",
    name: "SKIN DEEP MASTER FOLDER", kind: "b-roll", subjects: [], brands: ["lolli-brands"],
    film: "Skin Deep", year: 2023, ogKey: "https://www.lollibrands.com/skin-deep",
  },
  {
    id: "film-guru-master",
    title: "The Guru — Master Asset Folder",
    description:
      "The complete archive for George Farah's story: child soldier to bodybuilding icon. Nineteen Best Documentary awards — the most decorated film on the slate.",
    name: "THE GURU MASTER FOLDER", kind: "b-roll", subjects: [], brands: ["lolli-brands"],
    film: "The Guru", year: 2024, ogKey: "https://www.lollibrands.com/the-guru",
  },
  {
    id: "film-guru-premiere",
    title: "The Guru — Premiere Coverage",
    description: "Red carpet and premiere night footage for The Guru.",
    name: "GURU Premiere", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["lolli-brands"], film: "The Guru", event: "The Guru Premiere", year: 2024,
  },
  {
    id: "film-guru-gallery",
    title: "The Guru — Premiere Photo Gallery",
    description: "The full-resolution premiere gallery, browsable in Pic-Time.",
    name: "The Guru Photo Gallery", kind: "event photography", subjects: [],
    brands: ["lolli-brands"], film: "The Guru", event: "The Guru Premiere", year: 2024,
  },

  {
    id: "film-shealed-master",
    title: "sHEALed — Master Asset Folder",
    description:
      "The four-part women's health saga: Becoming, Awakening, Rising, Protocols. In production for 2026 release.",
    name: "sHEALed MASTER FOLDER", kind: "b-roll", subjects: ["tereza"],
    brands: ["biohack-yourself"], film: "sHEALed", year: 2026,
    ogKey: "https://www.biohackyourself.com/shealeddoc",
  },
  {
    id: "film-shealed-bts",
    title: "sHEALed — Behind the Scenes",
    description: "Production stills and footage from the sHEALed shoot.",
    name: "sHEALed BTS", kind: "BTS", subjects: ["tereza"], brands: ["biohack-yourself"],
    film: "sHEALed", year: 2026,
  },
  {
    id: "film-shealed-gallery",
    title: "sHEALed — Production Photo Gallery",
    description: "The browsable production gallery in Pic-Time.",
    name: "sHEALed Photo Gallery", kind: "event photography", subjects: ["tereza"],
    brands: ["biohack-yourself"], film: "sHEALed", year: 2026,
  },
  {
    id: "film-shealed-sandiego",
    title: "sHEALed — San Diego: David Perez Wellness Center",
    description: "Location footage from the San Diego shoot with Todd Ovokaitys.",
    name: "sHEALed - San Diego - David Perez Wellness Center + Todd Ovokaitys", kind: "b-roll",
    subjects: ["tereza"], brands: ["biohack-yourself"], film: "sHEALed", year: 2026,
  },
  {
    id: "film-shealed-atlanta",
    title: "sHEALed — Atlanta: V-Cell Therapy",
    description: "Location footage with Todd Ovokaitys and Dr. V, Georgia.",
    name: "sHEALed - Todd Ovokaytis and Dr. V Georgia, Atlanta V-Cell Therapy", kind: "b-roll",
    subjects: ["tereza"], brands: ["biohack-yourself"], film: "sHEALed", year: 2026,
  },

  {
    id: "film-bye-ol-dentistry-master",
    title: "Bye Ol' Dentistry — Master Asset Folder",
    description:
      "The biological-dentistry documentary, in production. Real-time procedures, expert insight, patient journeys.",
    name: "BYE OL DENTISTRY MASTER FOLDER", kind: "b-roll", subjects: [],
    brands: ["biohack-yourself"], film: "Bye Ol' Dentistry", year: 2026,
    ogKey: "https://www.biohackyourself.com/byeoldentistry",
  },
  {
    id: "film-bye-ol-dentistry-gallery",
    title: "Bye Ol' Dentistry — Photo Gallery",
    description: "The browsable production gallery in Pic-Time.",
    name: "Bye Ol’ Dentistry Photo Gallery", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], film: "Bye Ol' Dentistry", year: 2026,
  },
  {
    id: "film-bye-ol-dentistry-poster",
    title: "Bye Ol' Dentistry — Poster",
    description: "The film's poster as a single file.",
    name: "Poster", from: "mediakit", kind: "poster", subjects: [], brands: ["biohack-yourself"],
    film: "Bye Ol' Dentistry", year: 2026,
  },
  {
    id: "film-new-woo",
    title: "The New Woo — Film Page",
    description:
      "In pre-production. Where practices once dismissed as woo meet modern science.",
    explicitUrl: "https://www.biohackyourself.com/thenewwoo", kind: "press", subjects: [],
    brands: ["biohack-yourself"], film: "The New Woo", year: 2026,
    ogKey: "https://www.biohackyourself.com/thenewwoo",
  },

  // ── Events ───────────────────────────────────────────────────────────
  {
    id: "event-maha-footage",
    title: "MAHA Inaugural Ball — Footage",
    description:
      "Waldorf Astoria, Washington D.C., 20 January 2025. Biohack Yourself Media was the exclusive health press.",
    name: "MAHA Footage", kind: "b-roll", subjects: ["anthony", "tereza", "love", "legend"],
    brands: ["biohack-yourself"], event: "MAHA Inaugural Ball", year: 2025,
    ogKey: "https://www.biohackyourself.com/maha",
  },
  {
    id: "event-maha-gallery",
    title: "MAHA Inaugural Ball — Photo Gallery",
    description: "The full red-carpet gallery, browsable in Pic-Time.",
    name: "MAHA Photo Gallery", kind: "event photography",
    subjects: ["anthony", "tereza"], brands: ["biohack-yourself"],
    event: "MAHA Inaugural Ball", year: 2025,
  },
  {
    id: "event-maha-interviews",
    title: "MAHA Inaugural Ball — Exclusive Red Carpet Interviews",
    description: "The VIP interviews captured on the night, as individual files.",
    name: "Exclusive Interviews", from: "mediakit", kind: "b-roll",
    subjects: ["anthony", "tereza"], brands: ["biohack-yourself"],
    event: "MAHA Inaugural Ball", year: 2025,
  },
  {
    id: "event-maha-recaps",
    title: "MAHA Inaugural Ball — Recap Videos",
    description: "Cut recap videos from the evening, ready to embed.",
    name: "Recap Videos", from: "mediakit", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "MAHA Inaugural Ball", year: 2025,
  },
  {
    id: "event-a4m-premiere",
    title: "Biohack Yourself World Premiere — A4M, the Oscars of Longevity",
    description: "Footage from the world premiere at A4M.",
    name: "A4M Biohack Yourself", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Biohack Yourself World Premiere", year: 2024,
    ogKey: "https://www.biohackyourself.com/biohackyourselfworldpremiere",
  },
  {
    id: "event-a4m-gallery",
    title: "Biohack Yourself World Premiere — Photo Gallery",
    description: "The full premiere gallery, browsable in Pic-Time.",
    name: "BY World Premiere Photo Gallery", kind: "event photography",
    subjects: ["anthony", "tereza"], brands: ["biohack-yourself"],
    event: "Biohack Yourself World Premiere", year: 2024,
  },
  {
    id: "event-miami-swim-week",
    title: "Miami Swim Week 2025 — Coverage",
    description: "Event coverage from Miami Swim Week.",
    name: "Miami Swim Week 2025", kind: "event photography", subjects: ["tereza"],
    brands: ["biohack-yourself"], event: "Miami Swim Week", year: 2025,
    ogKey: "https://www.biohackyourself.com/miamiswimweek",
  },
  {
    id: "event-sas-turning-point",
    title: "SAS Turning Point — Tampa",
    description: "Coverage from the SAS Turning Point summit in Tampa.",
    name: "SAS Turning Point Tampa", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "SAS Turning Point", year: 2025,
    ogKey: "https://www.biohackyourself.com/turningpoint",
  },
  {
    id: "event-ufc-aires",
    title: "UFC × Aires Tech Roundtable — Las Vegas",
    description: "The roundtable coverage, June 2025.",
    name: "UFC Aires Tech Round Table", kind: "event photography", subjects: ["anthony"],
    brands: ["biohack-yourself"], event: "UFC × Aires Tech Roundtable", year: 2025,
    ogKey: "https://www.biohackyourself.com/ufcairestechroundtable",
  },
  {
    id: "event-zenos",
    title: "Zenos Health Summit — Riyadh, Saudi Arabia",
    description: "International summit coverage from Riyadh.",
    name: "Zenos Health Summit", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Zenos Health Summit", year: 2025,
    ogKey: "https://www.biohackyourself.com/zenos",
  },
  {
    id: "event-andrew-tate",
    title: "Andrew Tate Production — Dubai, UAE",
    description: "Production coverage from the Dubai shoot.",
    name: "Andrew Tate Production", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Andrew Tate Production", year: 2025,
  },
  {
    id: "event-bryan-johnson",
    title: "Bryan Johnson — In-Home Biohacking Production",
    description:
      "The Bryan Johnson house shoot. Extensive equipment, the biohacking room, mainstream context.",
    name: "Bryan Johnson", kind: "b-roll", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Bryan Johnson Production", year: 2025,
    ogKey: "https://www.biohackyourself.com/bryanjohnson",
  },
  {
    id: "event-hack-your-health",
    title: "Hack Your Health — Coverage",
    description: "Event coverage from Hack Your Health.",
    name: "Hack Your Health", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Hack Your Health", year: 2025,
    ogKey: "https://www.biohackyourself.com/hackyourhealth",
  },
  {
    id: "event-lara-trump-gallery",
    title: "Lara Trump — Photo Gallery",
    description: "The Lara Trump gallery, browsable in Pic-Time.",
    name: "Lara Trump Photo Gallery", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], event: "Lara Trump", year: 2025,
    ogKey: "https://www.biohackyourself.com/lara-trump",
  },
  {
    id: "event-lara-trump-cover",
    title: "Lara Trump — Magazine Cover Photoshoot",
    description: "The cover shoot for the Fall 2025 issue.",
    name: "Lara Trump Photoshoot Magazine Cover", kind: "magazine", subjects: [],
    brands: ["biohack-yourself"], event: "Lara Trump", year: 2025,
  },
  {
    id: "event-cold-collective",
    title: "The Cold Collective — Coverage",
    description: "Event coverage from The Cold Collective.",
    name: "The Cold Collective", kind: "event photography", subjects: ["love"],
    brands: ["biohack-yourself"], event: "The Cold Collective", year: 2025,
  },
  {
    id: "event-vibe-conference",
    title: "VibeCon Orlando 2025 — Coverage",
    description: "Event coverage from the 2025 Vibe Conference.",
    name: "2025 Vibe Conference", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "VibeCon Orlando", year: 2025,
    ogKey: "https://www.biohackyourself.com/vibeconorlando",
  },
  {
    id: "event-ultimate-wellness",
    title: "Ultimate Wellness Miami — Coverage",
    description: "Event coverage from Ultimate Wellness Miami.",
    name: "The Ultimate Wellness", kind: "event photography", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Ultimate Wellness Miami", year: 2025,
    ogKey: "https://www.biohackyourself.com/ultimatewellnessmiami",
  },
  {
    id: "event-sunscreen-festival",
    title: "Sunscreen Film Festival 2025 — Coverage",
    description: "Festival coverage, 2025.",
    name: "Sun Screen Film Festival 2025", kind: "event photography",
    subjects: ["anthony", "tereza"], brands: ["lolli-brands"],
    event: "Sunscreen Film Festival", year: 2025,
  },
  {
    id: "event-bloom-tv",
    title: "Bloom TV — Studio Appearance",
    description:
      "The Bloom TV episode with Gayle Guyardo, dedicated entirely to the documentary and the movement.",
    name: "Bloom TV", kind: "press", subjects: ["anthony", "tereza"],
    brands: ["biohack-yourself"], event: "Bloom TV", year: 2025,
  },
  {
    id: "event-phil-daru",
    title: "Phil Daru — Ruck 100",
    description: "Coverage of the Ruck 100 with Phil Daru.",
    name: "Phil Daru Ruck 100", kind: "event photography", subjects: ["anthony"],
    brands: ["biohack-yourself"], event: "Phil Daru Ruck 100", year: 2025,
    ogKey: "https://www.biohackyourself.com/phildaru",
  },
  {
    id: "event-blue-scorpion",
    title: "Blue Scorpion Equinox — Coverage",
    description: "Event coverage from Blue Scorpion Equinox.",
    name: "Blue Scorpion Equinox", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], event: "Blue Scorpion Equinox", year: 2025,
  },
  {
    id: "event-bbc",
    title: "BBC News / Business Daily — B-Roll Package",
    description:
      "The B-roll package supplied to the BBC: the family using biohacking equipment in real environments.",
    name: "BBC Broll", kind: "b-roll", subjects: ["anthony", "tereza", "love", "legend"],
    brands: ["biohack-yourself"], event: "BBC Feature", year: 2026,
  },
  {
    id: "event-gabrielle-lyon-signing",
    title: "Dr. Gabrielle Lyon — Magazine Signing",
    description: "Coverage of the Dr. Gabrielle Lyon magazine signing.",
    name: "Gabrielle Lyon Magazine Signing", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], event: "Dr. Gabrielle Lyon Book Signing", year: 2026,
    ogKey: "https://www.biohackyourself.com/drgabriellelyonbooksigning",
  },
  {
    id: "event-amy-shah-signing",
    title: "Dr. Amy Shah — Book Signing",
    description: "Coverage of the Amy Shah book signing.",
    name: "Amy Shah Book Signing", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], event: "Amy Shah Book Signing", year: 2026,
  },
  {
    id: "event-flip-and-fix",
    title: "Flip and Fix Real Estate — Coverage",
    description: "Coverage of the Flip and Fix real estate production.",
    name: "Flip and Fix Real Estate", kind: "b-roll", subjects: ["love", "legend"],
    brands: ["lolli-holdings"], event: "Flip and Fix Real Estate", year: 2026,
  },
  {
    id: "event-robert-whitfield",
    title: "Robert Whitfield — Grand Opening",
    description: "Coverage of the grand opening.",
    name: "Robert Whilfield Grand Opening", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], event: "Robert Whitfield Grand Opening", year: 2026,
  },
  {
    id: "event-mar-a-lago",
    title: "Mar-a-Lago — Event Coverage",
    description: "Coverage from Mar-a-Lago, at the intersection of health, media and power.",
    explicitUrl: "https://drive.google.com/drive/folders/1ZVUmHCi39p-KhGBcpbnnMJob2iwiwfix",
    kind: "event photography", subjects: ["love"], brands: ["biohack-yourself"],
    event: "Mar-a-Lago", year: 2025,
  },

  // ── Children — drafted as private pending written sign-off (§9). ──────
  {
    id: "kids-legend-pushups",
    title: "Legend Lolli — Push-Up Challenge",
    description:
      "Legend's push-up challenge footage, including sessions with public figures.",
    name: "Push Up Challenge", kind: "b-roll", subjects: ["legend"],
    brands: ["biohack-yourself"], year: 2025, private: true,
  },
  {
    id: "kids-love-magazine-cover",
    title: "Love Lolli — Magazine Cover",
    description: "Love Lolli's magazine cover shoot.",
    name: "Love Magazine Cover", kind: "magazine", subjects: ["love"],
    brands: ["biohack-yourself"], year: 2025, private: true,
  },
  {
    id: "kids-maha-ball",
    title: "Love & Legend Lolli — MAHA Inaugural Ball",
    description: "The children at the MAHA Inaugural Ball.",
    name: "Love and Legend MAHA Ball", kind: "event photography", subjects: ["love", "legend"],
    brands: ["biohack-yourself"], event: "MAHA Inaugural Ball", year: 2025, private: true,
  },
  {
    id: "kids-miami-fashion-week",
    title: "Love & Legend Lolli — Miami Fashion Week",
    description: "The children at Miami Fashion Week.",
    name: "Love and Legend Miami Fashion Week", kind: "event photography",
    subjects: ["love", "legend"], brands: ["biohack-yourself"],
    event: "Miami Fashion Week", year: 2025, private: true,
  },
  {
    id: "kids-de-niro",
    title: "Legend Lolli — with Robert De Niro",
    description: "Legend Lolli photographed with Robert De Niro.",
    name: "Legend with Robert De Niro", kind: "event photography", subjects: ["legend"],
    brands: ["lolli-brands"], year: 2025, private: true,
  },
  {
    id: "kids-real-estate-awards",
    title: "Love & Legend Lolli — Real Estate Awards",
    description: "Award coverage for the children's real estate work.",
    name: "Love and Legend Real Estate Awards", kind: "event photography",
    subjects: ["love", "legend"], brands: ["lolli-holdings"], year: 2025, private: true,
  },

  // ── Magazine ─────────────────────────────────────────────────────────
  {
    id: "mag-issue-1-amen",
    title: "Biohack Yourself Magazine — Issue 1: Dr. Daniel Amen",
    description: "Spring 2025. Cover subject Dr. Daniel Amen.",
    name: "Issue # 1 Dr. Amen", kind: "magazine", subjects: [], brands: ["biohack-yourself"],
    year: 2025, preview: "https://preview.emagazines.com/biohack_yourself/20250428/index.html",
  },
  {
    id: "mag-issue-2-brecka",
    title: "Biohack Yourself Magazine — Issue 2: Gary & Cole Brecka",
    description: "Summer 2025. Cover subjects Gary and Cole Brecka.",
    name: "Issue #2 Gary Brecka", kind: "magazine", subjects: [], brands: ["biohack-yourself"],
    year: 2025, preview: "https://preview.emagazines.com/biohack_yourself/20250722/index.html",
  },
  {
    id: "mag-issue-3-lara-trump",
    title: "Biohack Yourself Magazine — Issue 3: Lara Trump",
    description: "Fall 2025. Cover subject Lara Trump.",
    name: "Issue #3 Lara Trump", kind: "magazine", subjects: [], brands: ["biohack-yourself"],
    year: 2025,
    preview: "https://preview.emagazines.com/issue/biohack-yourself/fall-2025/fall-2025-cover",
  },
  {
    id: "mag-issue-4-lyon",
    title: "Biohack Yourself Magazine — Issue 4: Dr. Gabrielle Lyon",
    description: "Winter 2025/26. Cover subject Dr. Gabrielle Lyon.",
    name: "Issue#4 Dr. Gabrielle Lyon", kind: "magazine", subjects: [],
    brands: ["biohack-yourself"], year: 2026,
    preview: "https://preview.emagazines.com/biohack_yourself/20260127/index.html",
  },
  {
    id: "mag-issue-5-tate",
    title: "Biohack Yourself Magazine — Issue 5: Andrew Tate",
    description: "Spring 2026. Cover subject Andrew Tate.",
    name: "Issue#5 Andrew Tate", kind: "magazine", subjects: [], brands: ["biohack-yourself"],
    year: 2026,
    preview: "https://preview.emagazines.com/biohack_yourself/20260421/mobile/index.html",
  },
  {
    id: "mag-issue-8-ashton-hall",
    title: "Biohack Yourself Magazine — Issue 8: Ashton Hall, Cover Shoot",
    description: "The cover shoot deliverables for issue eight.",
    name: "Cover Shoot", kind: "magazine", subjects: [], brands: ["biohack-yourself"], year: 2026,
  },
  {
    id: "mag-all-galleries",
    title: "Biohack Yourself — All Photo Galleries",
    description:
      "The Pic-Time portfolio root: every event gallery in one place. Pass-protected.",
    name: "ALL PHOTO GALLERIES", kind: "event photography", subjects: [],
    brands: ["biohack-yourself"], year: null,
  },
];

// Streaming — "where to watch" references. Storing the URL is the whole
// treatment; there is no asset behind these and never will be.
const WHERE_TO_WATCH = [
  { film: "Biohack Yourself", platform: "Amazon Prime", url: "https://www.primevideo.com/detail/Biohack-Yourself/0O8SET9FPZ27KCVR7X801S8R6V", free: false },
  { film: "Biohack Yourself", platform: "Apple TV", url: "https://tv.apple.com/gb/show/biohack-yourself/umc.cmc.6cnceq13g3a59xneq5be4uomk", free: false },
  { film: "Biohack Yourself", platform: "Roku", url: "https://www.roku.com/whats-on/tv-shows/biohack-yourself?id=24b16773cac4c52c43100b80de788d36", free: true },
  { film: "Biohack Yourself", platform: "Plex", url: "https://watch.plex.tv/movie/biohack-yourself-lifespanning-our-vitality", free: true },
  { film: "Biohack Yourself", platform: "Fawesome", url: "https://fawesome.tv/movies/10653131/biohack-yourself", free: true },
  { film: "From Fat Lolli to 6 Pack Lolli", platform: "Amazon Prime", url: "https://www.amazon.com/Lolli-Pack-Ultimate-Transformation-Story/dp/B08C4QMNVK", free: false },
  { film: "From Fat Lolli to 6 Pack Lolli", platform: "Apple TV", url: "https://tv.apple.com/us/movie/from-fat-lolli-to-six-pack-lolli-the-ultimate-transformation-story/umc.cmc.5dt5hxanf7eofnl39tzjw8hcp", free: false },
  { film: "From Fat Lolli to 6 Pack Lolli", platform: "Tubi", url: "https://tubitv.com/movies/689773/from-fat-lolli-to-six-pack-lolli-the-ultimate-transformation-story", free: true },
  { film: "From Fat Lolli to 6 Pack Lolli", platform: "YouTube", url: "https://www.youtube.com/watch?v=AGZDzg-9OBI", free: true },
  { film: "From Fat Lolli to 6 Pack Lolli", platform: "Google Play", url: "https://play.google.com/store/movies/details?id=aEDsKnIQrvk.P", free: false },
  { film: "The Super Lollis", platform: "Amazon Prime", url: "https://www.amazon.com/The-Super-Lollis/dp/B0B77XC6H2", free: false },
  { film: "The Super Lollis", platform: "Apple TV", url: "https://tv.apple.com/us/show/the-super-lollis/umc.cmc.2gb0v1ejqlkzoom2wuaz39n2x", free: false },
  { film: "The Super Lollis", platform: "Tubi", url: "https://tubitv.com/series/300010066/the-super-lollis", free: true },
  { film: "The Super Lollis", platform: "Roku", url: "https://www.roku.com/whats-on/tv-shows/the-super-lollis?id=495546b97ae478cf065894e2d1a2bca4", free: true },
  { film: "The Super Lollis", platform: "Hoopla", url: "https://www.hoopladigital.com/television/super-lollis-season-1-love-lolli/15684533", free: true },
  { film: "Skin Deep", platform: "Amazon Prime", url: "https://www.primevideo.com/detail/Skin-Deep/0RFLOZWG2HQWDFRPX6DKD7DAS4", free: false },
  { film: "Skin Deep", platform: "Tubi", url: "https://tubitv.com/movies/100012031/skin-deep", free: true },
  { film: "The Guru", platform: "Amazon Prime", url: "https://www.primevideo.com/detail/The-Guru/0LL24MC9UCL5BWH6N3M9L7LY6T", free: false },
  { film: "The Guru", platform: "Tubi", url: "https://tubitv.com/movies/100022677/the-guru", free: true },
  { film: "The Guru", platform: "Plex", url: "https://watch.plex.tv/movie/the-guru-2024", free: true },
  { film: "The Guru", platform: "Roku", url: "https://therokuchannel.roku.com/details/22b1ba25bf9dcce74576f65dd9fe30ce/the-guru", free: true },
  { film: "The Guru", platform: "Hoopla", url: "https://www.hoopladigital.com/movie/the-guru-george-farah/17012223", free: true },
  { film: "sHEALed", platform: "Amazon Prime", url: "https://www.primevideo.com/detail/0U6F3RDIZGLYJPF0RLJEK5UOPY", free: false },
  { film: "sHEALed", platform: "Plex", url: "https://watch.plex.tv/movie/shealed-part-2-awakening", free: true },
  { film: "sHEALed", platform: "HNN", url: "https://watch.healthnewsnetwork.us/player/?video_id=dcf207c4-c061-40d9-9637-098a27e2a0cd&cat_id=80718a4f-a797-450c-b26f-e6946f9ced74", free: true },
];

// ── Build ───────────────────────────────────────────────────────────────

/**
 * Previews harvested from each platform's own thumbnail service by
 * build-previews.mjs. Optional: the catalog builds without it, entries just
 * carry no imagery. Run build-previews.mjs after adding entries.
 */
const previewFile = `${ROOT}/data/fampire/previews.json`;
const previews = existsSync(previewFile)
  ? JSON.parse(readFileSync(previewFile, "utf8")).previews
  : {};

/**
 * Last night's link sweep, from scripts/fampire/check-links.mjs. Optional: the
 * catalog builds without it and every entry simply reads `unchecked`.
 */
const healthFile = `${ROOT}/data/fampire/link-health.json`;
const health = existsSync(healthFile)
  ? JSON.parse(readFileSync(healthFile, "utf8")).health
  : {};

const built = ENTRIES.map((e) => {
  const raw = e.explicitUrl ?? (e.name ? link(e.name, { from: e.from }) : null);
  const { url, rewritten_from } = normalizeUrl(raw);
  const source_platform = platformOf(url);
  const derivedAccess = deriveAccess(url, source_platform);
  const subjects = e.subjects ?? [];
  const ogRow = e.ogKey ? og.get(e.ogKey) : null;

  return {
    id: e.id,
    title: e.title,
    description: e.description,
    url,
    rewritten_from,
    alternates: e.alternates ?? [],
    preview: e.preview ?? null,
    source_platform,
    access: e.access ?? derivedAccess,
    visibility: e.private || derivedAccess === "broken" ? "private" : "public",
    kind: e.kind,
    subjects,
    brands: e.brands ?? [],
    film: e.film ?? null,
    event: e.event ?? null,
    year: e.year ?? null,
    // Drafted, never decided. A person confirms every true before publish.
    contains_minor: subjects.some((s) => MINORS.has(s)),
    contains_minor_confirmed: false,
    // Order matters: the platform's own thumbnail of the actual folder beats
    // the marketing og:image of a page that merely mentions it.
    image: previews[`entry:${e.id}`]?.image ?? pageSpecificImage(ogRow),
    strip: previews[`entry:${e.id}`]?.strip ?? [],
    /** True when every thumbnail in the folder is a flat fill — a chroma-key
     *  lower-third pack, a transparent logo set. Correct data, but it must be
     *  CONTAINED rather than cover-cropped, or the card becomes a solid green
     *  rectangle with no indication that it is an asset preview at all. */
    image_flat: Boolean(previews[`entry:${e.id}`]?.flat),
    /** Where the picture came from, so the UI can be honest about it. */
    image_source: previews[`entry:${e.id}`]?.image
      ? previews[`entry:${e.id}`].note
      : pageSpecificImage(ogRow)
        ? "og"
        : null,
    source_page: e.ogKey ?? null,
    status: health[`entry:${e.id}`]?.status ?? "unchecked",
    status_detail: health[`entry:${e.id}`]?.detail ?? null,
    last_checked: health[`entry:${e.id}`]?.last_checked ?? null,
  };
});

/**
 * A measured dead link overrides whatever we assumed at authoring time. This
 * is the point of the monitor: the catalog's own `access` field is a guess
 * from the URL shape, the sweep is evidence.
 */
for (const e of built) {
  if (e.status === "gone") e.access = "broken";
  else if (e.status === "login-required" && e.access === "public") e.access = "request";
  else if (e.status === "password" && e.access === "public") e.access = "password";
  // Anything not openable by a stranger must not sit in the public pool
  // presenting itself as a working link.
  if (e.access === "broken" || e.access === "request") e.visibility = "private";
}

/**
 * Dropbox shared folders publish nothing to preview — 19 collections would
 * otherwise be blank cards. Where such a collection belongs to a film, borrow
 * that film's key art: it is representative of the collection, and key art
 * reads unmistakably AS key art, so no one mistakes it for a photograph of the
 * folder's contents. Recorded as `borrowed` either way.
 */
const posterByFilm = new Map();
for (const e of built) {
  if (!e.film || !e.image) continue;
  if (e.kind === "poster" || e.kind === "trailer") posterByFilm.set(e.film, e.image);
}
let borrowed = 0;
for (const e of built) {
  if (e.image || !e.film) continue;
  const art = posterByFilm.get(e.film);
  if (!art) continue;
  e.image = art;
  e.image_source = "borrowed-film-art";
  borrowed++;
}

// Fail loudly rather than shipping an entry that silently points nowhere.
const noUrl = built.filter((e) => !e.url);
if (missing.length || noUrl.length) {
  for (const m of missing) console.error(`  unresolved anchor: ${m}`);
  for (const e of noUrl) console.error(`  entry has no url:  ${e.id}`);
  console.error(`\n${missing.length} unresolved, ${noUrl.length} entries without a url.`);
  process.exit(1);
}

const dupes = built.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) {
  console.error(`duplicate ids: ${dupes.join(", ")}`);
  process.exit(1);
}

const catalog = {
  generated_from: [
    "data/fampire/sources/broll-asset-library-links.json",
    "data/fampire/sources/media-kit-page-links.json",
    "data/fampire/sources/opengraph.json",
  ],
  entries: built,
  where_to_watch: WHERE_TO_WATCH,
};

writeFileSync(`${ROOT}/data/fampire/catalog.json`, `${JSON.stringify(catalog, null, 2)}\n`);

const by = (fn) =>
  built.reduce((a, e) => {
    const k = fn(e);
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});

console.log(`catalog.json — ${built.length} entries, ${WHERE_TO_WATCH.length} watch links`);
console.log("  platform  ", by((e) => e.source_platform));
console.log("  access    ", by((e) => e.access));
console.log("  visibility", by((e) => e.visibility));
console.log(`  minor-flag drafts awaiting confirmation: ${built.filter((e) => e.contains_minor).length}`);
console.log(
  `  previews: ${built.filter((e) => e.image).length}/${built.length}` +
    ` (${borrowed} borrowed film art, ${built.filter((e) => !e.image).length} without)`,
);
console.log("  link status", by((e) => e.status));
