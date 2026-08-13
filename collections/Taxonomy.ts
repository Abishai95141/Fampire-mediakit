import type { CollectionConfig } from "payload";

/**
 * The taxonomy behind the filters.
 *
 * These are real collections rather than free-text fields on Entry, for three
 * reasons the build plan forces:
 *
 *  - §4.5 rule 2, "no exclusive parents": an entry is simultaneously
 *    person:TereZa, event:MAHA Ball, year:2025, kind:event photography.
 *    Relationships express that; a folder path cannot.
 *  - §6 requires two axes filtering at once and every filter state to be
 *    URL-addressable. Relationships give stable slugs to put in the URL.
 *  - The media team must be able to rename "MAHA Ball" to "MAHA Inaugural
 *    Ball" once and have every entry follow. With text fields that is a
 *    find-and-replace across 486 rows.
 *
 * All four are readable by the public — they drive routing and facet labels —
 * and writable by the internal team.
 */

const publicRead = {
  read: () => true,
  create: ({ req }: { req: { user?: { role?: string } | null } }) =>
    req.user?.role === "admin" || req.user?.role === "approver",
  update: ({ req }: { req: { user?: { role?: string } | null } }) => Boolean(req.user),
  delete: ({ req }: { req: { user?: { role?: string } | null } }) => req.user?.role === "admin",
};

const slug = {
  name: "slug",
  type: "text" as const,
  required: true,
  unique: true,
  index: true,
  admin: { description: "URL segment. Appears in shareable filter links." },
};

/**
 * Everyone who appears in the library — the four family members and the ~180
 * named guests derived from folder paths.
 *
 * `isMinor` is the field the child-safety filter actually keys on. Love and
 * Legend Lolli are children (§10); flipping this on a person is what makes
 * every entry featuring them reviewable, rather than relying on 486 individual
 * per-entry flags staying correct.
 */
export const People: CollectionConfig = {
  slug: "people",
  admin: { useAsTitle: "name", defaultColumns: ["name", "role", "isMinor", "isFamily"], group: "Who & What" },
  access: publicRead,
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description:
          "TereZa is always spelled with a capital Z — everywhere, including alt text and metadata. Hard client rule.",
      },
    },
    slug,
    { name: "role", type: "text", admin: { description: "How to describe them in a caption, e.g. 'Founder', 'Guest'." } },
    { name: "bio", type: "textarea" },
    {
      name: "isFamily",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "One of the four Lolli family members." },
    },
    {
      name: "isMinor",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "A child. Every entry featuring them needs contains_minor confirmed by a person before it publishes.",
      },
    },
  ],
};

/** The slate. Seven released plus what is in production, with award counts. */
export const Films: CollectionConfig = {
  slug: "films",
  admin: { useAsTitle: "title", defaultColumns: ["title", "year", "awards", "status"], group: "Who & What" },
  access: publicRead,
  fields: [
    { name: "title", type: "text", required: true },
    slug,
    { name: "synopsis", type: "textarea" },
    { name: "awards", type: "number", defaultValue: 0, admin: { description: "Best-documentary awards." } },
    { name: "year", type: "number" },
    {
      name: "status",
      type: "select",
      defaultValue: "released",
      options: [
        { label: "Released", value: "released" },
        { label: "In production", value: "in-production" },
        { label: "In pre-production", value: "pre-production" },
      ],
    },
    {
      name: "note",
      type: "text",
      admin: { description: "One line, e.g. 'Six episodes' or 'Five-part flagship'." },
    },
    {
      // Where-to-watch is a reference matrix, not hosted media (§3.1): storing
      // the URL is the correct treatment for a streaming platform.
      name: "watch",
      type: "array",
      labels: { singular: "Where to watch", plural: "Where to watch" },
      fields: [
        { name: "platform", type: "text", required: true },
        { name: "url", type: "text", required: true },
        { name: "free", type: "checkbox", defaultValue: false, admin: { description: "No paywall." } },
      ],
    },
  ],
};

/** Named events across 2024–2026. */
export const Events: CollectionConfig = {
  slug: "events",
  admin: { useAsTitle: "title", defaultColumns: ["title", "startDate", "location"], group: "Who & What" },
  access: publicRead,
  fields: [
    { name: "title", type: "text", required: true },
    slug,
    { name: "summary", type: "textarea" },
    { name: "startDate", type: "date" },
    { name: "endDate", type: "date", admin: { description: "Leave empty for a single-day event." } },
    { name: "location", type: "relationship", relationTo: "locations" },
  ],
};

/** Places. Small list, but it is a filter axis and an entry can be found by it. */
export const Locations: CollectionConfig = {
  slug: "locations",
  // "Places" to an editor; `locations` in the database and the API.
  labels: { singular: "Place", plural: "Places" },
  admin: { useAsTitle: "label", defaultColumns: ["label", "slug"], group: "Who & What" },
  access: publicRead,
  fields: [
    { name: "label", type: "text", required: true },
    slug,
  ],
};
