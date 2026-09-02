import type { Block } from "payload";

/**
 * The page builder.
 *
 * Every surface in §6 — the institution home, the six narrative sections, a
 * brand landing page, a one-off press page — is assembled from these blocks.
 * The point is that a new page with a structure nobody anticipated needs no
 * deploy: the media team picks blocks, orders them, publishes.
 *
 * Two rules from §4.5 are baked in rather than left to editorial discipline:
 *
 *  - Rule 3, "cards, not chapters": the narrative blocks embed REAL collection
 *    cards inline (`entryList`, `entryGrid`), pulled live from the catalog.
 *    A section can never drift out of date relative to the entries it describes.
 *  - Rule 4, "search never disappears": `searchBar` exists as a block, but the
 *    site shell renders search persistently regardless — the block is for
 *    placing an ADDITIONAL, pre-scoped search inside a page.
 */

const heading: Block["fields"] = [
  { name: "eyebrow", type: "text", admin: { description: "Small label above the heading." } },
  { name: "heading", type: "text" },
  { name: "intro", type: "textarea" },
];

export const Hero: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    ...heading,
    {
      name: "media",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Video loop", value: "video" },
        { label: "Still image", value: "image" },
      ],
    },
    { name: "mediaUrl", type: "text", admin: { condition: (_, s) => s?.media && s.media !== "none" } },
    {
      name: "actions",
      type: "array",
      maxRows: 3,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
        {
          name: "emphasis",
          type: "select",
          defaultValue: "primary",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
        },
      ],
    },
  ],
};

export const RichText: Block = {
  slug: "richText",
  labels: { singular: "Rich text", plural: "Rich text" },
  fields: [
    { name: "content", type: "richText", required: true },
    {
      name: "width",
      type: "select",
      defaultValue: "prose",
      options: [
        { label: "Prose column", value: "prose" },
        { label: "Full width", value: "full" },
      ],
    },
  ],
};

/**
 * A live, filtered slice of the catalog.
 *
 * This is how a narrative page shows real material without anyone copying
 * entries into page content. The filters mirror the Library's facets, so a
 * section is literally a saved view of the pool (§6: "sections are lenses; 7 is
 * the pool. Same records — a collection is never duplicated").
 */
export const EntryQuery: Block = {
  slug: "entryQuery",
  labels: { singular: "Collection cards (filtered)", plural: "Collection cards (filtered)" },
  fields: [
    ...heading,
    {
      type: "row",
      fields: [
        {
          name: "layout",
          type: "select",
          defaultValue: "grid",
          admin: { width: "50%" },
          options: [
            { label: "Grid", value: "grid" },
            { label: "Row (horizontal scroll)", value: "row" },
            { label: "List", value: "list" },
            { label: "Single spotlight", value: "spotlight" },
          ],
        },
        { name: "limit", type: "number", defaultValue: 6, admin: { width: "50%" } },
      ],
    },
    {
      name: "filters",
      type: "group",
      admin: { description: "Leave a filter empty to ignore it. Filters combine — two axes at once." },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "kind",
              type: "select",
              hasMany: true,
              admin: { width: "50%" },
              options: [
                "b-roll", "event photography", "headshots", "poster", "logo", "trailer",
                "BTS", "podcast", "press", "magazine", "document", "interview", "audio",
              ].map((v) => ({ label: v, value: v })),
            },
            {
              name: "occasion",
              type: "select",
              hasMany: true,
              admin: { width: "50%" },
              options: [
                "premiere", "book-signing", "clinic-production", "conference", "cover-shoot",
                "roundtable", "speaking", "festival", "interview", "workout", "podcast",
                "unspecified",
              ].map((v) => ({ label: v, value: v })),
            },
          ],
        },
        {
          /**
           * Missing until now, which is why a page could ask for vertical
           * b-roll and get everything: Payload silently drops a filter key
           * that has no field, so /clip-them rendered byte-identical
           * "Vertical" and "Horizontal" rows.
           */
          name: "orientation",
          type: "select",
          hasMany: true,
          options: [
            { label: "Vertical", value: "portrait" },
            { label: "Horizontal", value: "landscape" },
            { label: "Square", value: "square" },
            { label: "Mixed", value: "mixed" },
          ],
        },
        { name: "brand", type: "relationship", relationTo: "brands" },
        { name: "people", type: "relationship", relationTo: "people", hasMany: true },
        { name: "film", type: "relationship", relationTo: "films" },
        { name: "event", type: "relationship", relationTo: "events" },
        { name: "location", type: "relationship", relationTo: "locations" },
        { name: "year", type: "number" },
        {
          name: "excludeMinors",
          type: "checkbox",
          defaultValue: false,
          admin: { description: "Hide anything flagged as containing a minor, confirmed or not." },
        },
      ],
    },
    {
      name: "sort",
      type: "select",
      defaultValue: "-fileCount",
      options: [
        { label: "Largest first", value: "-fileCount" },
        { label: "Newest first", value: "-dateStart" },
        { label: "Oldest first", value: "dateStart" },
        { label: "A–Z", value: "title" },
      ],
    },
    {
      name: "viewAll",
      type: "text",
      admin: { description: "Optional link to the same filter in the Library, so the lens opens into the pool." },
    },
  ],
};

/** Hand-picked entries, in a chosen order. For when a curator wants exactly
 *  these four, not "the top four by size". */
export const EntryPicks: Block = {
  slug: "entryPicks",
  labels: { singular: "Collection cards (hand-picked)", plural: "Collection cards (hand-picked)" },
  fields: [
    ...heading,
    { name: "entries", type: "relationship", relationTo: "entries", hasMany: true, required: true },
    {
      name: "layout",
      type: "select",
      defaultValue: "grid",
      options: [
        { label: "Grid", value: "grid" },
        { label: "Row (horizontal scroll)", value: "row" },
        { label: "List", value: "list" },
      ],
    },
  ],
};

/** The four intent lanes — Book them · Write about them · Clip them · Stage
 *  them — or any other set of pre-filtered doorways. */
export const Lanes: Block = {
  slug: "lanes",
  labels: { singular: "Intent lanes", plural: "Intent lanes" },
  fields: [
    ...heading,
    {
      name: "lanes",
      type: "array",
      minRows: 2,
      maxRows: 6,
      required: true,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "detail", type: "text" },
        { name: "href", type: "text", required: true, admin: { description: "A pre-filtered Library view." } },
      ],
    },
    {
      name: "layout",
      type: "select",
      defaultValue: "cards",
      options: [
        { label: "Cards", value: "cards" },
        /* Picture, oversized numeral, card — the approved layout's numbered
           progression. The picture is pulled from the collections each lane
           actually leads to, never uploaded. */
        { label: "Numbered progression (picture beside each)", value: "phases" },
      ],
    },
  ],
};

export const Stats: Block = {
  slug: "stats",
  labels: { singular: "Stat row", plural: "Stat rows" },
  fields: [
    ...heading,
    {
      name: "stats",
      type: "array",
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: "value", type: "text", required: true },
        { name: "label", type: "text", required: true },
        {
          name: "source",
          type: "select",
          defaultValue: "manual",
          admin: {
            description:
              "Live values are computed from the catalog at request time, so they cannot go stale.",
          },
          options: [
            { label: "Typed by hand", value: "manual" },
            { label: "Live — published collections", value: "entryCount" },
            { label: "Live — films with material", value: "filmCount" },
            { label: "Live — films on the slate (incl. none yet)", value: "filmRecordCount" },
            { label: "Live — total awards", value: "awardTotal" },
            { label: "Live — files covered", value: "fileCount" },
          ],
        },
      ],
    },
  ],
};

export const FilmStrip: Block = {
  slug: "filmStrip",
  labels: { singular: "Films", plural: "Films" },
  fields: [
    ...heading,
    {
      name: "dark",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Render the section on the near-black band." },
    },
    {
      name: "films",
      type: "relationship",
      relationTo: "films",
      hasMany: true,
      admin: { description: "Leave empty to show the whole slate." },
    },
    {
      /**
       * The layouts the site actually uses, offered as a choice rather than
       * three near-identical blocks. "Full profiles" is what /films renders;
       * "poster grid" is the home page's row of four.
       */
      name: "layout",
      type: "select",
      defaultValue: "list",
      options: [
        { label: "Compact list", value: "list" },
        { label: "Poster grid", value: "grid" },
        { label: "Full profiles (synopsis, artwork, where to watch)", value: "profiles" },
        /* The approved layout's module accordion. Eight films as eight
           posters is a wall; eight rows you can open is a slate. */
        { label: "Accordion (one open at a time, with synopsis)", value: "accordion" },
      ],
    },
    { name: "showWatchLinks", type: "checkbox", defaultValue: true },
  ],
};

export const PeopleRow: Block = {
  slug: "peopleRow",
  labels: { singular: "People", plural: "People" },
  fields: [
    ...heading,
    {
      name: "people",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      admin: { description: "Leave empty to show the whole family." },
    },
    {
      name: "layout",
      type: "select",
      defaultValue: "portraits",
      options: [
        { label: "Names only", value: "names" },
        { label: "Portrait grid", value: "portraits" },
        { label: "Full profiles (portrait, bio, collection count)", value: "profiles" },
        /* The approved landing layout's roster: a list of names and roles,
           with the hovered person's portrait and bio beside it. Suits people
           who hold several roles at once better than a portrait grid can. */
        { label: "Roster (names and roles, portrait beside)", value: "roster" },
      ],
    },
    {
      name: "showBios",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Bios come from Who & What → People, so they are written once and reused.",
        condition: (_, s) => s?.layout !== "profiles",
      },
    },
  ],
};

/**
 * The home page's opening frame: film on the left, reading matter beside it.
 *
 * Type over moving footage is unreadable at any scrim strength — the picture
 * keeps changing underneath it — so the two never overlap. That constraint is
 * baked into the block rather than left to whoever assembles the page.
 */
export const HeroFeature: Block = {
  slug: "heroFeature",
  labels: { singular: "Feature hero (video + rail)", plural: "Feature heroes" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "intro", type: "textarea", admin: { description: "The paragraph beside the film." } },
    {
      name: "videoId",
      type: "text",
      label: "Video",
      admin: {
        description:
          "A YouTube or Vimeo URL, or a bare Vimeo ID. Leave empty for the still poster. Note: a Vimeo video whose privacy settings disable embedding will refuse to play on any site — the page falls back to the poster.",
      },
    },
    { name: "startAt", type: "number", admin: { description: "Seconds into the film to start." } },
    {
      name: "stats",
      type: "array",
      maxRows: 4,
      admin: { description: "The figures on the rail. Live sources are recomputed every request." },
      fields: [
        { name: "value", type: "text" },
        { name: "label", type: "text", required: true },
        {
          name: "source",
          type: "select",
          defaultValue: "entryCount",
          options: [
            { label: "Typed by hand", value: "manual" },
            { label: "Live — published collections", value: "entryCount" },
            { label: "Live — films with material", value: "filmCount" },
            { label: "Live — events covered", value: "eventCount" },
            { label: "Live — files covered", value: "fileCount" },
            { label: "Live — total awards", value: "awardTotal" },
          ],
        },
      ],
    },
    {
      name: "actions",
      type: "array",
      maxRows: 2,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
        {
          name: "emphasis",
          type: "select",
          defaultValue: "primary",
          options: [
            { label: "Solid", value: "primary" },
            { label: "Outline", value: "secondary" },
          ],
        },
      ],
    },
  ],
};

/** The inverted band that gives a page its spine. */
export const Statement: Block = {
  slug: "statement",
  labels: { singular: "Statement band (dark)", plural: "Statement bands" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "heading", type: "text", required: true },
    { name: "body", type: "textarea" },
    { name: "secondary", type: "textarea", admin: { description: "A quieter second paragraph." } },
    { name: "actionLabel", type: "text" },
    { name: "actionHref", type: "text" },
  ],
};

/** The magazine shelf — issues pulled live from the catalog. */
export const MagazineShelf: Block = {
  slug: "magazineShelf",
  labels: { singular: "Magazine shelf", plural: "Magazine shelves" },
  fields: [
    ...heading,
    { name: "aside", type: "text", admin: { description: "The fact on the right of the heading." } },
    { name: "limit", type: "number", defaultValue: 12 },
  ],
};

/** Where to watch — the streaming matrix, per film. */
export const WatchGrid: Block = {
  slug: "watchGrid",
  labels: { singular: "Where to watch", plural: "Where to watch" },
  fields: [
    ...heading,
    {
      name: "note",
      type: "textarea",
      admin: { description: "The closing note under the matrix. Optional." },
    },
  ],
};

/**
 * The Library itself, as a block.
 *
 * This is what makes the Library editable rather than a hardcoded route: the
 * facets, the page size and the heading are all page content. Filters set here
 * are LOCKED — a reader can add to them but cannot clear them — which is how
 * one browser serves both `/library` and a single world's shelf.
 */
export const LibraryBrowser: Block = {
  slug: "libraryBrowser",
  labels: { singular: "Library browser (faceted)", plural: "Library browsers" },
  fields: [
    ...heading,
    {
      type: "row",
      fields: [
        { name: "perPage", type: "number", defaultValue: 60, admin: { width: "50%" } },
        {
          name: "showFacets",
          type: "checkbox",
          defaultValue: true,
          admin: { width: "50%", description: "The filter rail down the left." },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "showSearch", type: "checkbox", defaultValue: true, admin: { width: "33%" } },
        { name: "showSort", type: "checkbox", defaultValue: true, admin: { width: "33%" } },
        { name: "showCount", type: "checkbox", defaultValue: true, admin: { width: "33%" } },
      ],
    },
    {
      name: "locked",
      type: "group",
      label: "Locked filters",
      admin: {
        description:
          "Always applied and not removable by the reader. Leave empty for the whole pool.",
      },
      fields: [
        { name: "brand", type: "relationship", relationTo: "brands" },
        {
          name: "kind",
          type: "select",
          hasMany: true,
          options: [
            "b-roll", "event photography", "headshots", "poster", "logo", "trailer",
            "BTS", "podcast", "press", "magazine", "document", "interview", "audio",
          ].map((v) => ({ label: v, value: v })),
        },
        {
          name: "orientation",
          type: "select",
          hasMany: true,
          options: [
            { label: "Vertical", value: "portrait" },
            { label: "Horizontal", value: "landscape" },
            { label: "Square", value: "square" },
            { label: "Mixed", value: "mixed" },
          ],
        },
      ],
    },
  ],
};

/** The press log — appearances, newest first, with the big ones lifted out. */
export const PressList: Block = {
  slug: "pressList",
  labels: { singular: "Press log", plural: "Press logs" },
  fields: [
    ...heading,
    {
      name: "featuredCount",
      type: "number",
      defaultValue: 3,
      admin: { description: "How many of the most-watched appearances lead the page. 0 for none." },
    },
    { name: "limit", type: "number", admin: { description: "Leave empty for all of them." } },
    {
      name: "layout",
      type: "select",
      defaultValue: "log",
      options: [
        { label: "Log (most watched, then the full list)", value: "log" },
        /* The approved layout's numbered progression. The numbering is real:
           Appearances are drag-ordered in the CMS, so 01 is the one the team
           put first. */
        { label: "Numbered progression (still beside each)", value: "progression" },
      ],
    },
    {
      name: "dark",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Render the section on the near-black band." },
    },
  ],
};

export const Quote: Block = {
  slug: "quote",
  fields: [
    { name: "quote", type: "textarea", required: true },
    { name: "attribution", type: "text" },
    { name: "source", type: "text", admin: { description: "Publication or outlet." } },
    { name: "sourceUrl", type: "text" },
  ],
};

export const Faq: Block = {
  slug: "faq",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    ...heading,
    {
      name: "items",
      type: "array",
      minRows: 1,
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "richText", required: true },
      ],
    },
  ],
};

/** A block of approved copy a booker or MC copies straight out of the page —
 *  the :30 introduction in §8's success criteria. */
export const CopyBlock: Block = {
  slug: "copyBlock",
  labels: { singular: "Copy-and-paste block", plural: "Copy-and-paste blocks" },
  fields: [
    ...heading,
    {
      name: "variants",
      type: "array",
      minRows: 1,
      fields: [
        { name: "label", type: "text", required: true, admin: { description: "e.g. ':30 introduction', 'Short bio'." } },
        { name: "text", type: "textarea", required: true },
      ],
    },
  ],
};

export const Embed: Block = {
  slug: "embed",
  fields: [
    ...heading,
    { name: "url", type: "text", required: true, admin: { description: "Trailer or reel. Never a gated asset." } },
    {
      name: "aspect",
      type: "select",
      defaultValue: "16-9",
      options: [
        { label: "16:9", value: "16-9" },
        { label: "9:16 vertical", value: "9-16" },
        { label: "1:1", value: "1-1" },
      ],
    },
  ],
};

export const Cta: Block = {
  slug: "cta",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    ...heading,
    {
      name: "actions",
      type: "array",
      minRows: 1,
      maxRows: 3,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
      ],
    },
    {
      name: "note",
      type: "text",
      admin: {
        description:
          "No gates on public surfaces — a CTA may link to a contact page, never sit in front of an asset as a form.",
      },
    },
  ],
};

export const SearchBar: Block = {
  slug: "searchBar",
  labels: { singular: "Scoped search", plural: "Scoped searches" },
  fields: [
    { name: "placeholder", type: "text", defaultValue: "Search the library" },
    {
      name: "scope",
      type: "group",
      admin: { description: "Pre-scope the search. Empty means the whole catalog." },
      fields: [
        {
          /**
           * Missing until now, which is why a page could ask for vertical
           * b-roll and get everything: Payload silently drops a filter key
           * that has no field, so /clip-them rendered byte-identical
           * "Vertical" and "Horizontal" rows.
           */
          name: "orientation",
          type: "select",
          hasMany: true,
          options: [
            { label: "Vertical", value: "portrait" },
            { label: "Horizontal", value: "landscape" },
            { label: "Square", value: "square" },
            { label: "Mixed", value: "mixed" },
          ],
        },
        { name: "brand", type: "relationship", relationTo: "brands" },
        {
          name: "kind",
          type: "select",
          hasMany: true,
          options: [
            "b-roll", "event photography", "headshots", "poster", "logo", "trailer",
            "BTS", "podcast", "press", "magazine", "document", "interview", "audio",
          ].map((v) => ({ label: v, value: v })),
        },
      ],
    },
  ],
};

export const Divider: Block = {
  slug: "divider",
  fields: [
    {
      name: "spacing",
      type: "select",
      defaultValue: "medium",
      options: [
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
    },
  ],
};

/** Two or three blocks side by side. This is what lets an editor build a
 *  structure the original design never anticipated. */
export const Columns: Block = {
  slug: "columns",
  fields: [
    {
      name: "columns",
      type: "array",
      minRows: 2,
      maxRows: 3,
      required: true,
      fields: [
        {
          name: "width",
          type: "select",
          defaultValue: "equal",
          options: [
            { label: "Equal", value: "equal" },
            { label: "Wide", value: "wide" },
            { label: "Narrow", value: "narrow" },
          ],
        },
        { name: "content", type: "richText" },
        { name: "entries", type: "relationship", relationTo: "entries", hasMany: true },
      ],
    },
  ],
};

/**
 * Every block an editor can place, grouped the way they are described in the
 * admin: the big structural pieces first, then the catalog lenses, then the
 * editorial furniture.
 *
 * The list is deliberately complete — every surface on the site, including the
 * landing page and the Library, is assembled from these. Nothing on a public
 * page is hardcoded JSX any more, because the moment one page is special the
 * whole "select a page, edit its blocks" model stops being trustworthy.
 */

/**
 * The landing page's opening frame, in the approved Zeen layout.
 *
 * A fanned deck of portrait cards behind an oversized wordmark. The deck is
 * NOT a list of uploaded images: it reads People out of the CMS, so the
 * brief's "any new people added through the CMS should automatically be
 * accessible wherever people are showcased" holds for the hero too. Leave
 * `people` empty and it shows the family, newest portrait treatment first.
 *
 * Five cards is the measured count in the approved layout and the point at
 * which the fan still reads as a fan; the field caps there rather than
 * letting an editor add a sixth that overlaps the wordmark.
 */
export const DeckHero: Block = {
  slug: "deckHero",
  labels: { singular: "Deck hero (fanned portraits)", plural: "Deck heroes" },
  fields: [
    { name: "wordmark", type: "text", required: true, admin: { description: "The oversized mark. FAMPIRE." } },
    { name: "headline", type: "textarea", admin: { description: "The claim beside it. Two or three lines." } },
    {
      name: "headlineTail",
      type: "text",
      admin: { description: "Trailing words rendered in grey, as in the approved layout." },
    },
    { name: "rail", type: "text", admin: { description: "Vertical rail text down the left edge." } },
    { name: "note", type: "textarea", admin: { description: "Small paragraph at lower right." } },
    {
      name: "people",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      maxDepth: 1,
      admin: {
        description:
          "Whose portraits fan across the hero. Leave empty to show the family automatically — then adding a family member in the CMS adds a card here with no page edit.",
      },
    },
  ],
};

/**
 * "We've helped them grow" — the brand strip.
 *
 * Reads the Brands collection rather than taking uploaded logos, which is the
 * brief's second CMS requirement: a new brand is added in Payload and appears
 * here with nothing to change on the page. Brands have no logo artwork in this
 * system, so they set as wordmarks in the display face — which is also how the
 * approved layout sets them.
 */
export const BrandStrip: Block = {
  slug: "brandStrip",
  labels: { singular: "Brand strip", plural: "Brand strips" },
  fields: [
    { name: "label", type: "text", defaultValue: "We\u2019ve helped them grow" },
    {
      name: "brands",
      type: "relationship",
      relationTo: "brands",
      hasMany: true,
      admin: { description: "Leave empty to show every brand in the CMS, in order." },
    },
    {
      name: "marquee",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Scroll the strip. Pauses on hover, and respects reduced-motion." },
    },
  ],
};

/**
 * Very large type with a portrait at each outer edge.
 *
 * The approved layout uses this construction twice, at two settings: once with
 * the pictures overlapping the words, once with them pushed to the sides of a
 * centred stack. One block with an `overlap` switch, rather than two blocks
 * that differ by a rotation.
 */
export const StatementSplitBlock: Block = {
  slug: "statementSplit",
  labels: { singular: "Split statement (big type, two portraits)", plural: "Split statements" },
  fields: [
    {
      name: "lines",
      type: "array",
      minRows: 1,
      maxRows: 6,
      required: true,
      admin: { description: "One line of display type per row." },
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "overlap",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Let the pictures sit behind the words rather than beside them." },
    },
    {
      name: "portraits",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      maxDepth: 1,
      admin: {
        description:
          "Two people, left and right. Leave empty to use the first two family members, so the section follows the CMS.",
      },
    },
    {
      name: "notes",
      type: "array",
      maxRows: 2,
      admin: { description: "Optional short lines beneath, one at each side." },
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    { name: "dark", type: "checkbox", defaultValue: false, admin: { description: "Render on the near-black band." } },
  ],
};

export const PAGE_BLOCKS: Block[] = [
  // Structure
  DeckHero, BrandStrip, StatementSplitBlock, HeroFeature, Hero, Statement, RichText, Columns, Divider,
  // The catalog, seen through different lenses
  LibraryBrowser, EntryQuery, EntryPicks, FilmStrip, PeopleRow,
  MagazineShelf, WatchGrid, PressList,
  // Editorial furniture
  Lanes, Stats, Quote, Faq, CopyBlock, Embed, Cta, SearchBar,
];
