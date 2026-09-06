import type { Block, CollectionSlug } from "payload";

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


/**
 * PAGE-OWNED ITEMS.
 * ────────────────────────────────────────────────────────────────────────
 * The landing page holds its own cards. A row here is a card ON THIS PAGE:
 * its picture, its words, its link. Editing one changes the page and nothing
 * else — the person, brand or film it happens to be about is never written
 * to. Adding a row adds a card; deleting a row removes it from the page and
 * from nowhere else.
 *
 * `source` is a convenience, not a dependency. Point a row at a record and
 * any field you leave BLANK inherits from it, so the common case needs no
 * retyping and stays current when the record changes. Fill a field in and
 * the page wins permanently. That is the whole contract: inherit by default,
 * override freely, never write back.
 *
 * Leaving the whole array empty keeps the old behaviour — the section shows
 * the collection — so nothing that already exists breaks by upgrading.
 */
const sourceField = (relationTo: CollectionSlug, what: string): NonNullable<Block["fields"]>[number] => ({
  name: "source",
  type: "relationship",
  relationTo,
  admin: {
    description: `Optional. Blank fields below fall back to this ${what}. Anything typed here wins, and the ${what} record is never changed.`,
  },
});

/** Picture for a page-owned card: an upload, or a URL to something already hosted. */
const pictureFields: NonNullable<Block["fields"]> = [
  {
    /**
     * The landing page's OWN bucket, not Media and not the person's portrait.
     * Uploading here is a page decision and changes nothing else.
     */
    name: "image",
    /**
     * `upload`, not `relationship`.
     *
     * A relationship to an upload collection renders a bare dropdown of
     * filenames — which is why the report was "there is no image button".
     * `type: "upload"` renders the real control: a thumbnail of what is
     * currently set, and a picker that both browses the bucket and accepts a
     * new file on the spot.
     */
    type: "upload",
    relationTo: "landing-assets",
    admin: {
      description:
        "The picture for this element. Upload a new one or choose from Landing images — the page's own bucket. Nothing here touches a Person, Film or Brand record.",
    },
  },
  {
    name: "imageUrl",
    type: "text",
    admin: { description: "Or paste a URL. Used only if no image is picked above." },
  },
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
        { label: "Ledger (live collection + file counts, no imagery)", value: "phases" },
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
      /**
       * Taken off THIS page, not deleted.
       *
       * These sections show everything in their collection by default, so
       * dropping one item used to mean listing all the others. Subtracting is
       * the operation people actually want, and it is reversible: the record
       * keeps existing and still appears everywhere else on the site.
       *
       * Normally set by the ✕ on the item itself while signed in; editable
       * here too.
       */
      name: "hidden",
      type: "relationship",
      relationTo: "films",
      hasMany: true,
      label: "Hidden on this page",
      admin: { description: "Removed from this section only. The record itself is untouched." },
    },
    {
      name: "dark",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Render the section on the near-black band." },
    },
    {
      name: "items",
      type: "array",
      labels: { singular: "Film row", plural: "Film rows" },
      admin: {
        description:
          "The rows on this page, in order. Title, synopsis and key art here belong to the page — editing them never changes the Film record. Leave empty to show the whole slate automatically.",
      },
      fields: [
        sourceField("films", "film"),
        ...pictureFields,
        { name: "title", type: "text" },
        { name: "synopsis", type: "textarea" },
        {
          type: "row",
          fields: [
            { name: "year", type: "number", admin: { width: "33%" } },
            { name: "awards", type: "number", admin: { width: "33%" } },
            { name: "status", type: "text", admin: { width: "34%" } },
          ],
        },
        {
          name: "watch",
          type: "array",
          labels: { singular: "Watch link", plural: "Watch links" },
          admin: { description: "Overrides the film's own links when any row is present." },
          fields: [
            { name: "platform", type: "text", required: true },
            { name: "url", type: "text", required: true },
            { name: "free", type: "checkbox" },
          ],
        },
      ],
    },
    {
      name: "films",
      type: "relationship",
      relationTo: "films",
      hasMany: true,
      admin: { description: "Only used when the row list above is empty." },
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
      name: "cards",
      type: "array",
      labels: { singular: "Card", plural: "Cards" },
      admin: {
        description:
          "The people shown here, in order. Each card's picture, name, role and words belong to THIS PAGE — editing one never changes the Person record, and deleting one removes it from this section only. Leave empty to show the family automatically.",
      },
      fields: [
        sourceField("people", "person"),
        ...pictureFields,
        { name: "name", type: "text" },
        { name: "role", type: "text", admin: { description: "The line under the name." } },
        { name: "bio", type: "textarea", admin: { description: "Overrides the bio from Who & What → People." } },
        { name: "href", type: "text", admin: { description: "Where the card links." } },
      ],
    },
    {
      name: "people",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      admin: { description: "Only used when the card list above is empty." },
    },
    {
      /**
       * Taken off THIS page, not deleted.
       *
       * These sections show everything in their collection by default, so
       * dropping one item used to mean listing all the others. Subtracting is
       * the operation people actually want, and it is reversible: the record
       * keeps existing and still appears everywhere else on the site.
       *
       * Normally set by the ✕ on the item itself while signed in; editable
       * here too.
       */
      name: "hidden",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      label: "Hidden on this page",
      admin: { description: "Removed from this section only. The record itself is untouched." },
    },
    {
      name: "dark",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Render the section on the near-black band." },
    },
    {
      name: "rail",
      type: "text",
      admin: {
        description: "Small label under the heading. Card stack layout only.",
        condition: (_, sib) => sib?.layout === "stack",
      },
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
        /* The approved layout's card stack: heading held on the left, and on
           the right a portrait with a dashed, numbered card lying across it. */
        { label: "Card stack (portrait behind a numbered card, dark band)", value: "stack" },
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
    { name: "limit", type: "number", admin: { description: "Only used when the list below is empty. Leave empty for all of them." } },
    {
      name: "items",
      type: "array",
      labels: { singular: "Appearance", plural: "Appearances" },
      admin: {
        description:
          "The appearances shown here, in order. Page-owned: the still, title and link can be changed without touching the Appearance record. Leave empty to show the log automatically.",
      },
      fields: [
        sourceField("appearances", "appearance"),
        ...pictureFields,
        { name: "title", type: "text" },
        { name: "outlet", type: "text" },
        { name: "when", type: "text", admin: { description: "Free text, e.g. \"17 May 2026\"." } },
        { name: "url", type: "text" },
      ],
    },
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
      /**
       * Taken off THIS page, not deleted.
       *
       * These sections show everything in their collection by default, so
       * dropping one item used to mean listing all the others. Subtracting is
       * the operation people actually want, and it is reversible: the record
       * keeps existing and still appears everywhere else on the site.
       *
       * Normally set by the ✕ on the item itself while signed in; editable
       * here too.
       */
      name: "hidden",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      label: "Hidden on this page",
      admin: { description: "Removed from this section only. The record itself is untouched." },
    },
    {
      name: "cards",
      type: "array",
      maxRows: 5,
      labels: { singular: "Card", plural: "Cards" },
      admin: {
        description:
          "The cards in the fan, in order. Add, edit, reorder or delete them freely — this is the page's own content and none of it changes a Person record. Leave the whole list empty to fall back to showing the family automatically.",
      },
      fields: [
        sourceField("people", "person"),
        ...pictureFields,
        { name: "name", type: "text", admin: { description: "Caption under the card." } },
        { name: "caption", type: "text", admin: { description: "Small line beneath the name." } },
        { name: "href", type: "text", admin: { description: "Where the card links. Defaults to that person's collections." } },
      ],
    },
    {
      name: "people",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      maxDepth: 1,
      admin: {
        description:
          "Only used when the card list above is empty: which people the automatic fallback shows. Leave both empty for the family.",
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
      name: "items",
      type: "array",
      labels: { singular: "Wordmark", plural: "Wordmarks" },
      admin: {
        description:
          "The wordmarks in the strip, in order. Page-owned: editing or deleting one does not touch the Brand record. Leave empty to show every brand automatically.",
      },
      fields: [
        sourceField("brands", "brand"),
        { name: "label", type: "text", admin: { description: "The wordmark text." } },
        { name: "href", type: "text", admin: { description: "Where it links. Defaults to that brand's Library filter." } },
      ],
    },
    {
      name: "brands",
      type: "relationship",
      relationTo: "brands",
      hasMany: true,
      admin: { description: "Only used when the list above is empty. Leave both empty to show every brand." },
    },
    {
      /**
       * Taken off THIS page, not deleted.
       *
       * These sections show everything in their collection by default, so
       * dropping one item used to mean listing all the others. Subtracting is
       * the operation people actually want, and it is reversible: the record
       * keeps existing and still appears everywhere else on the site.
       *
       * Normally set by the ✕ on the item itself while signed in; editable
       * here too.
       */
      name: "hidden",
      type: "relationship",
      relationTo: "brands",
      hasMany: true,
      label: "Hidden on this page",
      admin: { description: "Removed from this section only. The record itself is untouched." },
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
      name: "pictures",
      type: "array",
      maxRows: 2,
      labels: { singular: "Picture", plural: "Pictures" },
      admin: {
        description:
          "The two pictures, left then right. Page-owned: swap either one for a different image without touching a Person record. Leave empty to fall back to the first two family members.",
      },
      fields: [
        sourceField("people", "person"),
        ...pictureFields,
        { name: "name", type: "text", admin: { description: "Alt text. Falls back to the person's name." } },
      ],
    },
    {
      name: "portraits",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      maxDepth: 1,
      admin: {
        description: "Only used when the picture list above is empty. Leave both empty for the first two family members.",
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

/**
 * "Lately" — recap reels, one per member of the family.
 *
 * The landing page could say what the institution is and what it has made,
 * but nothing on it carried any sense of RECENCY. This is the block that
 * answers "what have they been up to".
 *
 * The video is a LINK, never an upload: paste the Google Drive share URL and
 * the poster and the player are both derived from it. That is the project's
 * standing rule — index and link, never copy — applied to video, and it means
 * re-cutting a recap in Drive updates the site with no upload and no deploy.
 */
export const RecapRowBlock: Block = {
  slug: "recapRow",
  labels: { singular: "Lately (recap reels)", plural: "Lately rows" },
  fields: [
    ...heading,
    {
      name: "layout",
      type: "select",
      defaultValue: "cards",
      options: [
        { label: "Cards (three across, opens a player)", value: "cards" },
        /* The approved reference: three panels on a turntable, the centre one
           playing inline with its own scrubber and filmstrip. */
        { label: "Turntable (3D, inline player with scrubber)", value: "coverflow" },
      ],
    },
    {
      name: "margin",
      type: "text",
      admin: {
        description: "Handwritten note in the top corner. Turntable layout only.",
        condition: (_, sib) => sib?.layout === "coverflow",
      },
    },
    {
      name: "recaps",
      type: "array",
      minRows: 1,
      maxRows: 6,
      required: true,
      labels: { singular: "Recap", plural: "Recaps" },
      fields: [
        {
          name: "who",
          type: "text",
          required: true,
          admin: { description: "Whose recap this is. Shown as the card's title." },
        },
        {
          name: "person",
          type: "relationship",
          relationTo: "people",
          hasMany: true,
          admin: {
            description:
              "Optional. Links the recap to People so it can be found by subject later; it does not change what the card shows.",
          },
        },
        { name: "blurb", type: "textarea", admin: { description: "One line under the name." } },
        { name: "when", type: "text", admin: { description: "Free text — \"This month\", \"May 2026\"." } },
        {
          name: "url",
          type: "text",
          required: true,
          admin: {
            description:
              "The Google Drive share link. Any form works — /file/d/<id>/view, open?id=, or the bare id. The file must be shared as 'anyone with the link', or the public site cannot play it.",
          },
        },
        {
          name: "videoUrl",
          type: "text",
          admin: {
            description:
              "A file this site can serve, e.g. /recaps/anthony-1080.mp4. Required by the turntable layout: its scrubber and filmstrip need a real video element, which a Google Drive iframe cannot provide. Leave empty and the card falls back to the Drive player.",
          },
        },
        {
          name: "stripUrl",
          type: "text",
          admin: {
            description:
              "Filmstrip image under the scrubber — frames tiled into one row. Optional.",
          },
        },
        {
          name: "posterUrl",
          type: "text",
          admin: {
            description:
              "Optional override. Left empty, the poster is Drive's own thumbnail for the file.",
          },
        },
      ],
    },
  ],
};

/**
 * A picture that opens as you scroll, with the statement held over it.
 *
 * Replaces the two flanking portraits for the "You are not invisible"
 * section. Those were a compromise: FAMPIRE's portraits are busy red-carpet
 * photographs, so the words could not cross them and ended up sitting
 * primly between two small pictures. One frame of the whole family, expanding
 * to full bleed under the line, says the thing the section is actually about.
 *
 * The picture comes from Landing images — the page's own bucket — so choosing
 * it is a page decision and touches no Person record.
 */
export const ScrollExpandBlock: Block = {
  slug: "scrollExpand",
  labels: { singular: "Scroll-expand statement", plural: "Scroll-expand statements" },
  fields: [
    ...pictureFields,
    { name: "alt", type: "text", admin: { description: "Describe the picture for someone who cannot see it." } },
    {
      name: "title",
      type: "text",
      admin: { description: "Held over the frame at rest, and lifts away as the picture takes over." },
    },
    { name: "scrollHint", type: "text", admin: { description: "Small cue under the resting frame. Fades on first scroll." } },
    {
      name: "lines",
      type: "array",
      labels: { singular: "Line", plural: "Lines" },
      admin: { description: "The statement, revealed once the picture reaches full bleed." },
      fields: [{ name: "text", type: "text", required: true }],
    },
    {
      name: "notes",
      type: "array",
      maxRows: 2,
      admin: { description: "Optional short lines beneath the statement." },
      fields: [{ name: "text", type: "textarea", required: true }],
    },
    {
      type: "collapsible",
      label: "Motion",
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            { name: "startWidth", type: "number", defaultValue: 42, admin: { width: "50%", description: "Resting frame width, % of the stage." } },
            { name: "startHeight", type: "number", defaultValue: 58, admin: { width: "50%", description: "Resting frame height, %." } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "mediaZoom", type: "number", defaultValue: 1.35, admin: { width: "50%", description: "Zoom at rest, easing to 1." } },
            { name: "scrollDistance", type: "number", defaultValue: 1.2, admin: { width: "50%", description: "Scroll length, in screen heights." } },
          ],
        },
      ],
    },
  ],
};

export const PAGE_BLOCKS: Block[] = [
  // Structure
  DeckHero, BrandStrip, StatementSplitBlock, ScrollExpandBlock, RecapRowBlock, HeroFeature, Hero, Statement, RichText, Columns, Divider,
  // The catalog, seen through different lenses
  LibraryBrowser, EntryQuery, EntryPicks, FilmStrip, PeopleRow,
  MagazineShelf, WatchGrid, PressList,
  // Editorial furniture
  Lanes, Stats, Quote, Faq, CopyBlock, Embed, Cta, SearchBar,
];
