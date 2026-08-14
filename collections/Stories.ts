import type { CollectionConfig } from "payload";

import { brandField } from "./brand";

/**
 * The three things a media team writes, as opposed to catalogs.
 *
 * `Collections` (the catalog) answers "where is the footage". None of these do.
 * They were missing entirely, which meant the CMS could describe the client's
 * storage but could not hold a single sentence the client actually wrote —
 * `press` and `magazine` existed only as *kinds* on a catalog row, i.e. a link
 * to a folder of press material, not a piece of writing.
 *
 * All three are tenant-scoped: an article belongs to one of the eight worlds.
 */

const publishedRead = {
  // Public press surfaces are ungated (§2.4); drafts stay internal.
  read: ({ req }: { req: { user?: unknown } }) =>
    req.user ? true : { _status: { equals: "published" } },
  create: ({ req }: { req: { user?: { role?: string } | null } }) => Boolean(req.user),
  update: ({ req }: { req: { user?: { role?: string } | null } }) => Boolean(req.user),
  delete: ({ req }: { req: { user?: { role?: string } | null } }) => req.user?.role === "admin",
};

/** TereZa, always with a capital Z (§10) — enforced at write time so a hand
 *  edit in the admin cannot reintroduce it. */
const tereZaHook = (fields: string[]) => [
  ({ data }: { data?: Record<string, unknown> }) => {
    if (!data) return data;
    for (const f of fields) {
      if (typeof data[f] === "string") {
        data[f] = (data[f] as string)
          .replace(/\bTereza\b/g, "TereZa")
          .replace(/\bTEREZA\b/g, "TereZa");
      }
    }
    return data;
  },
];

const slugField = {
  name: "slug",
  type: "text" as const,
  required: true,
  unique: true,
  index: true,
  admin: { description: "URL segment." },
};

const seoTab = {
  label: "SEO",
  description:
    "Competitors are never named, referenced or disparaged — including in SEO copy. Hard client rule.",
  fields: [
    { name: "seoTitle", type: "text" as const },
    { name: "seoDescription", type: "textarea" as const },
    { name: "seoImage", type: "relationship" as const, relationTo: "media" as const },
  ],
};

/**
 * Written pieces: press releases, announcements, features, statements.
 *
 * This is what "The Press" in §6 needs and what a journalist on deadline
 * actually reads before deciding whether to call.
 */
export const Articles: CollectionConfig = {
  slug: "articles",
  labels: { singular: "Article", plural: "Articles" },
  admin: {
    useAsTitle: "title",
    group: "Stories",
    defaultColumns: ["title", "type", "publishedAt", "_status"],
    description: "Press releases, announcements and features written by the team.",
  },
  versions: { drafts: { autosave: false }, maxPerDoc: 20 },
  access: publishedRead,
  hooks: { beforeValidate: tereZaHook(["title", "excerpt", "seoTitle", "seoDescription"]) },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Article",
          fields: [
            { name: "title", type: "text", required: true },
            slugField,
            brandField,
            {
              name: "type",
              type: "select",
              defaultValue: "press-release",
              index: true,
              options: [
                { label: "Press release", value: "press-release" },
                { label: "Announcement", value: "announcement" },
                { label: "Feature", value: "feature" },
                { label: "Statement", value: "statement" },
                { label: "Coverage elsewhere", value: "coverage" },
              ],
            },
            { name: "publishedAt", type: "date", index: true },
            {
              name: "excerpt",
              type: "textarea",
              admin: { description: "One or two sentences. Used on cards and in link previews." },
            },
            { name: "heroImage", type: "relationship", relationTo: "media" },
            { name: "body", type: "richText" },
            {
              name: "externalUrl",
              type: "text",
              admin: {
                description:
                  "For 'coverage elsewhere' — where it was published. Storing the URL is the correct treatment; we never rehost someone else's article.",
                condition: (data) => data?.type === "coverage",
              },
            },
          ],
        },
        {
          label: "Connections",
          description: "What this piece is about. Drives related-content rows and filtering.",
          fields: [
            { name: "people", type: "relationship", relationTo: "people", hasMany: true, index: true },
            { name: "films", type: "relationship", relationTo: "films", hasMany: true },
            { name: "events", type: "relationship", relationTo: "events", hasMany: true },
            {
              name: "relatedCollections",
              type: "relationship",
              relationTo: "entries",
              hasMany: true,
              admin: {
                description:
                  "Catalog collections a reader should be offered alongside — b-roll for the story, photography from the event.",
              },
            },
          ],
        },
        seoTab,
      ],
    },
  ],
};

/**
 * The magazine — eight issues, each with a named cover subject.
 *
 * Previously a bare `magazineIssue` integer on a catalog row, which could not
 * hold a cover image, a subject, or the fact that issues 6 (Bryan Johnson) and
 * 7 (Zachary Levi) have no links yet.
 */
export const MagazineIssues: CollectionConfig = {
  slug: "magazine-issues",
  labels: { singular: "Magazine Issue", plural: "Magazine Issues" },
  admin: {
    useAsTitle: "title",
    group: "Stories",
    defaultColumns: ["issueNumber", "title", "publishedAt", "_status"],
    description: "One record per issue. Cover subject, cover image, and where to read it.",
  },
  versions: { drafts: { autosave: false }, maxPerDoc: 10 },
  access: publishedRead,
  hooks: { beforeValidate: tereZaHook(["title", "summary", "seoTitle", "seoDescription"]) },
  defaultSort: "-issueNumber",
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Issue",
          fields: [
            {
              type: "row",
              fields: [
                { name: "issueNumber", type: "number", required: true, unique: true, index: true, admin: { width: "30%" } },
                { name: "title", type: "text", required: true, admin: { width: "70%" } },
              ],
            },
            slugField,
            brandField,
            { name: "coverSubject", type: "relationship", relationTo: "people", index: true },
            { name: "coverImage", type: "relationship", relationTo: "media" },
            { name: "publishedAt", type: "date" },
            { name: "summary", type: "textarea" },
            {
              name: "readUrl",
              type: "text",
              admin: {
                description:
                  "Where to read it. Leave empty if the client has not supplied a link — two issues currently have none, and an empty field is more honest than a dead one.",
              },
            },
            {
              name: "relatedCollections",
              type: "relationship",
              relationTo: "entries",
              hasMany: true,
              admin: { description: "Cover shoot and production folders for this issue." },
            },
          ],
        },
        seoTab,
      ],
    },
  ],
};

/**
 * Appearances — podcasts, panels, keynotes, broadcast hits.
 *
 * §8 sets the bar: "A new appearance is logged in <2 min and appears publicly."
 * So this collection is deliberately shallow. Every field a person has to fill
 * in is a field that pushes it past two minutes; only title, person and date
 * are required.
 */
export const Appearances: CollectionConfig = {
  slug: "appearances",
  labels: { singular: "Appearance", plural: "Appearances" },
  admin: {
    useAsTitle: "title",
    group: "Stories",
    defaultColumns: ["title", "outlet", "date", "type", "_status"],
    description: "Podcasts, panels, keynotes and broadcast. Log one in under two minutes.",
  },
  versions: { drafts: { autosave: false }, maxPerDoc: 10 },
  access: publishedRead,
  hooks: { beforeValidate: tereZaHook(["title", "summary"]) },
  defaultSort: "-date",
  fields: [
    { name: "title", type: "text", required: true },
    brandField,
    {
      type: "row",
      fields: [
        { name: "outlet", type: "text", admin: { width: "50%", description: "Show, publication or venue." } },
        {
          /**
           * Not required.
           *
           * The client's own log carries one appearance with no air date at
           * all, and the Press page has always rendered that as "—". Requiring
           * the field would make the archive unimportable and would force
           * whoever logs the next undated hit to invent a date, which is worse
           * than an em dash.
           *
           * Undated rows sort last, not first — see `PressLog`.
           */
          name: "date",
          type: "date",
          index: true,
          admin: { width: "50%", description: "Leave empty if the air date is unknown." },
        },
      ],
    },
    {
      /**
       * Not required.
       *
       * It was, and that is a rule the archive cannot satisfy: the client's own
       * media-kit page records the SHOW, not which family member sat in the
       * chair, so all 57 imported appearances would have failed validation on a
       * fact nobody has. Required fields are also what pushes logging one past
       * the two-minute bar in §8.
       */
      name: "people",
      type: "relationship",
      relationTo: "people",
      hasMany: true,
      index: true,
      admin: { description: "Who appeared. Leave empty if the log does not record it." },
    },
    {
      name: "type",
      type: "select",
      defaultValue: "podcast",
      index: true,
      options: [
        { label: "Podcast", value: "podcast" },
        { label: "Panel", value: "panel" },
        { label: "Keynote", value: "keynote" },
        { label: "Broadcast", value: "broadcast" },
        { label: "Print / online", value: "print" },
        { label: "Conference", value: "conference" },
      ],
    },
    { name: "url", type: "text", admin: { description: "Where to watch or listen." } },
    { name: "summary", type: "textarea" },
    {
      type: "row",
      fields: [
        {
          name: "views",
          type: "number",
          admin: {
            width: "50%",
            description:
              "Audience figure as the client recorded it. Reproduced verbatim, never estimated.",
          },
        },
        {
          name: "viewsAsOf",
          type: "text",
          admin: { width: "50%", description: "When that figure was captured, if known." },
        },
      ],
    },
    {
      name: "thumbnail",
      type: "text",
      admin: {
        description:
          "Still for the log row. An absolute URL from the platform's own thumbnail service — nothing is hosted here.",
      },
    },
    {
      /** A few appearances ran as multi-part series; each part is its own
       *  watchable link and the log should say so rather than pick one. */
      name: "parts",
      type: "array",
      labels: { singular: "Part", plural: "Parts" },
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
      ],
    },
  ],
};
