/**
 * Controlled vocabulary for enrichment.
 *
 * Everything here is a decision about how the client's production language
 * becomes a stranger's search language (build plan §4.5 rule 6). It is
 * deliberately a data file, not logic: the media team will correct these lists
 * during sign-off, and a correction should never require touching code.
 */

// ── Production-stage words ──────────────────────────────────────────────
// §4.2's stage vocabulary. Stripped from names when building a title; their
// presence never makes a folder unpublishable on its own.
export const STAGE_WORDS = [
  "raw", "edited", "colored", "color", "general", "bts", "photos", "photo",
  "videos", "video", "clips", "footage", "content", "dump", "card", "station",
  "day", "part", "final", "selects", "export", "exports", "master", "masters",
  "thumbnail", "thumbnails", "organized", "preview", "previews", "deliverable",
  "deliverables", "sorted", "post", "files", "media", "assets", "folder",
  "all", "new", "old", "misc", "other", "shots", "cuts", "reels", "shorts",
];

// ── Machine artifacts ───────────────────────────────────────────────────
// Camera roots, NLE bundles, cache directories. These are machine output, not
// content — they can never publish, and §4.2 already names most of them.
export const ARTIFACT_PATTERNS = [
  /\.lrdata$/i, /\.lrcat/i, /\.fcpbundle/i, /\.prproj/i, /\.aae$/i, /\.dav$/i,
  /^THMBNL$/i, /^M4ROOT$/i, /^DCIM$/i, /^MSDCF$/i, /^PRIVATE$/i, /^CLIPINF$/i,
  /^AVF_INFO$/i, /^BDMV$/i, /^XDROOT$/i, /^STREAM$/i, /^SUB$/i,
  /^Render Files$/i, /^Thumbnail Media$/i, /^Peak Files$/i, /^Preview Files$/i,
  /^Transcoded Media$/i, /^Original Media$/i, /^Analysis Files$/i,
  /^Motion Templates$/i, /^Autosave Vault$/i, /^Proxies$/i, /^Cache$/i,
  /^Temp$/i, /^\.tmp/i,
  /^[0-9A-F]{16,}$/,        // hashed render dirs
  /^[A-Z]\d{3,}$/,          // camera reels: A001, B2002, FL1001
];

/** Real content at the wrong granularity — per-camera raw dumps and archived
 *  duplicates. These merge upward into their parent subject rather than
 *  standing as their own catalog row. */
export const MERGE_UPWARD_PATTERNS = [
  /^[A-Z]_Cam_\d+/i,        // A_Cam_1_Lolli_Family_Opening
  /^ARCHIVE\b/i,
  /^Copy of /i,
  /^Day[ _]?\d+$/i,
  /^CARD ?\d+$/i,
  /^\d+$/,
  /^WM$/i,
  /^Dump ?\d*$/i,
  /^untitled/i,
];

// ── The slate ───────────────────────────────────────────────────────────
// slug, display title, and the aliases as they actually appear in folder
// names — including the client's own inconsistent casing.
export const FILMS = [
  { slug: "shealed", title: "sHEALed", aliases: ["shealed", "sheal ed", "sheald"] },
  { slug: "bye-ol-dentistry", title: "Bye Ol' Dentistry", aliases: ["bye ol dentistry", "bye ol' dentistry", "bye ol’ dentistry", "byeoldentistry", "bod"] },
  { slug: "biohack-yourself", title: "Biohack Yourself", aliases: ["biohack yourself", "biohackyourself", "a4m biohack yourself", "by world premiere"] },
  { slug: "the-guru", title: "The Guru", aliases: ["the guru", "guru"] },
  { slug: "skin-deep", title: "Skin Deep", aliases: ["skin deep", "skindeep"] },
  { slug: "the-super-lollis", title: "The Super Lollis", aliases: ["super lollis", "the super lollis"] },
  { slug: "from-fat-lolli", title: "From Fat Lolli to 6 Pack Lolli", aliases: ["fat lolli", "from fat lolli", "6 pack lolli"] },
  { slug: "the-new-woo", title: "The New Woo", aliases: ["the new woo", "new woo"] },
];

// ── Named events ────────────────────────────────────────────────────────
export const EVENTS = [
  { slug: "maha-ball", title: "MAHA Inaugural Ball", aliases: ["maha ball", "maha"] },
  { slug: "hack-your-health", title: "Hack Your Health", aliases: ["hack your health", "hyh"] },
  { slug: "zenos-health-summit", title: "Zenos Health Summit", aliases: ["zenos health summit", "zenos"] },
  { slug: "sunscreen-film-festival", title: "SunScreen Film Festival", aliases: ["sunscreen film festival", "sunscreen"] },
  { slug: "a4m-red-carpet", title: "A4M Red Carpet", aliases: ["a4m"] },
  { slug: "cannes", title: "Cannes Film Festival", aliases: ["cannes festival", "cannes"] },
  { slug: "america-dental", title: "America Dental", aliases: ["america dental"] },
  { slug: "sas-turning-point", title: "SAS Turning Point", aliases: ["sas turning point"] },
  { slug: "warriors-choice", title: "Warrior's Choice Foundation", aliases: ["warrior's choice", "warriors choice"] },
  { slug: "ufc-aires-roundtable", title: "UFC × Aires Tech Roundtable", aliases: ["ufc", "aires tech"] },
  { slug: "phil-daru-ruck-100", title: "Phil Daru Ruck 100", aliases: ["phil daru ruck", "ruck 100"] },
  { slug: "biohack-premiere", title: "Biohack Yourself Premiere", aliases: ["biohack yourself premiere", "by world premiere"] },
];

// ── Occasion ────────────────────────────────────────────────────────────
// A SECOND axis alongside `kind`. `kind` is what the asset is (photography,
// b-roll); `occasion` is what it came from. Two axes filtering at once is the
// requirement in §6 — this is what makes "video from a book signing" a query.
export const OCCASIONS = [
  { slug: "premiere", label: "Premiere", match: [/premiere/i, /red carpet/i, /screening/i] },
  { slug: "book-signing", label: "Book signing", match: [/book signing/i, /magazine signing/i, /signing/i] },
  { slug: "clinic-production", label: "Clinic production", match: [/clinic/i, /treatment/i, /grand opening/i] },
  { slug: "conference", label: "Conference", match: [/conference/i, /summit/i, /expo/i, /convention/i] },
  { slug: "cover-shoot", label: "Cover shoot", match: [/cover shoot/i, /cover photo/i] },
  { slug: "roundtable", label: "Roundtable", match: [/roundtable/i, /round table/i, /panel/i] },
  { slug: "speaking", label: "Speaking", match: [/speaking/i, /keynote/i, /stage/i, /talk/i] },
  { slug: "festival", label: "Festival", match: [/festival/i] },
  { slug: "interview", label: "Interview", match: [/interview/i, /q ?& ?a/i, /qna/i] },
  { slug: "workout", label: "Workout", match: [/work ?out/i, /challenge/i, /ruck/i, /push-?up/i] },
  { slug: "podcast", label: "Podcast", match: [/podcast/i] },
];

// ── Places ──────────────────────────────────────────────────────────────
export const LOCATIONS = [
  { slug: "las-vegas", label: "Las Vegas", match: [/\bvegas\b/i, /las vegas/i] },
  { slug: "miami", label: "Miami", match: [/\bmiami\b/i] },
  { slug: "tampa", label: "Tampa", match: [/\btampa\b/i] },
  { slug: "denver", label: "Denver", match: [/\bdenver\b/i] },
  { slug: "st-louis", label: "St. Louis, MO", match: [/st\.? ?louis/i] },
  { slug: "san-diego", label: "San Diego", match: [/san diego/i] },
  { slug: "atlanta", label: "Atlanta", match: [/\batlanta\b/i] },
  { slug: "germany", label: "Germany", match: [/\bgermany\b/i] },
  { slug: "cannes", label: "Cannes", match: [/\bcannes\b/i] },
  { slug: "new-york", label: "New York", match: [/\bnew york\b/i, /\bnyc\b/i] },
  { slug: "los-angeles", label: "Los Angeles", match: [/\blos angeles\b/i, /\bla\b(?![a-z])/i] },
  { slug: "orlando", label: "Orlando", match: [/\borlando\b/i] },
  { slug: "austin", label: "Austin", match: [/\baustin\b/i] },
];

// ── The family ──────────────────────────────────────────────────────────
// TereZa is ALWAYS spelled with a capital Z — everywhere, including alt text
// and metadata. Hard client rule (§10).
export const FAMILY = [
  { slug: "anthony", label: "Anthony Lolli", match: [/\banthony\b/i, /\banthony lolli\b/i] },
  { slug: "tereza", label: "TereZa Hakobyan-Lolli", match: [/\btereza\b/i, /\bhakobyan\b/i] },
  { slug: "love", label: "Love Lolli", match: [/\blove lolli\b/i, /\blove\b(?= ?&| and )/i] },
  { slug: "legend", label: "Legend Lolli", match: [/\blegend lolli\b/i, /\blegend\b/i] },
];

/** The two children. Any hit here drafts contains_minor — a person confirms
 *  every one before publish (§9.1). A false negative is not recoverable. */
export const MINOR_SUBJECTS = ["love", "legend"];

/** Phrases that imply children are present even when neither is named. */
export const MINOR_HINTS = [
  /\bkids?\b/i, /\bchildren\b/i, /\bfamily\b/i, /\bdaughter\b/i, /\bson\b/i,
  /\bschool\b/i, /\bbirthday\b/i, /love ?& ?legend/i, /love and legend/i,
];

/** Guests who appear by name and are not doctors, so the Dr. pattern misses
 *  them. Extend freely — this list only improves recall. */
export const KNOWN_PEOPLE = [
  "Ashton Hall", "Andrew Tate", "Gary Brecka", "Lara Trump", "Bryan Johnson",
  "Zachary Levi", "Del Bigtree", "Phil Daru", "Jay Dhaliwal", "Adam Chani",
  "Chris Jackson", "George Farah", "Ryan Encinas", "Carrie Drinkwine",
  "Natalie Jill", "Kim Vopni", "Maryn Azoff", "Justin Hai", "Nayan Payel",
  "Valerie Feghali", "Ana Maria", "Robert F. Kennedy Jr.", "Todd Ovokaytis",
  "David Perez", "Hannah", "Sam", "Maribel", "Darren", "Lisa",
];

/**
 * How a person's name got into a folder name.
 *
 * "Featuring Adam Chani" appeared on 85 collections. He is the BTS
 * cinematographer — the folder says `sHEALed BTS Adam Chani Master`, which
 * records who SHOT it. Crediting him as featured is a claim about who is in
 * the frame, sourced from a name that says the opposite. 78 of 85 TereZa
 * credits came from `owned by TereZa` — a rights label — or from
 * `TereZa Cell footage`, which means she was holding the camera.
 *
 * Each pattern captures the NAME in group 1, so the classifier can check that
 * the marker belongs to the person it is about rather than to someone else in
 * the same segment.
 */
export const CREW_PATTERNS = [
  // "sHEALed BTS Adam Chani Master" — the shooter of a BTS unit.
  /\bBTS\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s+Master\b/gi,
  // "sHEALed Main Deliverables Chris Jackson" — who cut and delivered it.
  /\bDeliverables?\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\b/gi,
  // "TereZa Cell footage", "TereZa Cell Phone" — whose phone shot it.
  /\b([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s+Cell(?:\s*Phone)?\b/gi,
  // "shot by X", "filmed by X", "edited by X"
  /\b(?:shot|filmed|edited|cut|produced|directed)\s+by\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\b/gi,
];

export const RIGHTS_PATTERNS = [
  // "5. Final sHeALed Unedited owned by TereZa"
  /\bowned\s+by\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\b/gi,
  /\bcourtesy\s+of\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\b/gi,
];

/** Names that are really stage words or crew, not catalog subjects. */
export const PERSON_STOPWORDS = new Set([
  "Sam", "Lisa", "Darren", "Maribel", "Hannah", "Ryan", "Day", "Card",
  "Raw", "Edited", "Final", "Master", "Photos", "Videos", "Grand", "Cover",
  // Occasion nouns that trail a name in folder titles: the `Dr. X Y` pattern
  // otherwise reads "Dr. Werber Clinic" as a surname of "Clinic".
  "Clinic", "Book", "Signing", "Premiere", "Interview", "Interviews",
  "Opening", "Shoot", "Event", "Production", "Productions", "Deliverables",
  "Content", "Footage", "Gallery", "Galleries", "Germany", "Miami", "Denver",
]);

// ── Brand routing ───────────────────────────────────────────────────────
// Which of the eight worlds an entry belongs to, decided by film/event.
// Order matters: first match wins.
export const BRAND_RULES = [
  { brand: "biohack-yourself", match: [/biohack/i, /a4m/i, /hack your health/i, /maha/i, /zenos/i, /magazine/i, /issue ?#/i] },
  { brand: "lolli-holdings", match: [/real estate/i, /flip and fix/i, /rapid realty/i] },
  { brand: "hnn", match: [/\bhnn\b/i, /health news network/i] },
  // Everything produced by the production house that is not explicitly one of
  // the above — the films and their shoots.
  { brand: "lolli-brands", match: [/.*/] },
];

// ── Kind mapping ────────────────────────────────────────────────────────
// The audit speaks 18 kinds; the front end's Entry contract speaks 11. Rather
// than force 18 into 11 and lose filter value, the finer distinctions move to
// `occasion` and two genuinely new mediums are added to `kind`.
//
// `byDominant` means: decide from the folder's actual media mix. A "clinic /
// treatment" folder of stills is event photography; the same occasion shot on
// video is b-roll. That is §4.4's type-coherence rule applied at import.
export const KIND_MAP = {
  photography: "event photography",
  "b-roll / video": "b-roll",
  "behind the scenes": "BTS",
  interview: "interview",
  "logos & wordmarks": "logo",
  "posters & key art": "poster",
  "press & media": "press",
  headshots: "headshots",
  trailer: "trailer",
  document: "document",
  audio: "audio",
  vector: "logo",
  "clinic / treatment": "byDominant",
  "conference / summit": "byDominant",
  "book signing": "byDominant",
  premiere: "byDominant",
  "stage & speaking": "byDominant",
  other: "byDominant",
};

/** What a folder's dominant media type means when the audit kind is generic. */
export const DOMINANT_KIND = {
  image: "event photography",
  video: "b-roll",
  document: "document",
  audio: "audio",
  vector: "logo",
  other: "b-roll",
};

/** The canonical kind vocabulary after mapping — 11 existing + 2 new.
 *  Adding to the union is safe: the front end looks kinds up with fallbacks
 *  (KIND_ALIASES[e.kind], KIND_RANK[a.kind] ?? 9), so unknown kinds degrade
 *  rather than break. */
export const KINDS = [
  "b-roll", "event photography", "headshots", "poster", "logo", "trailer",
  "BTS", "podcast", "press", "magazine", "document",
  "interview", "audio",
];
