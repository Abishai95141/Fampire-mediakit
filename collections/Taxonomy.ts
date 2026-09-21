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
  admin: { useAsTitle: "name", defaultColumns: ["name", "role", "isMinor", "isFamily"], group: "People & Films" },
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
    {
      /**
       * Every other spelling this person appears under.
       *
       * The archive names one person many ways — "Dr. Bales" and "Dr. Martin
       * Bales", "Dr. Amie Hornaman" and "Dr. Aimie Hornaman", "Steve" and
       * "Steven Moore" — because the names were read out of folder paths
       * written by different people over several years. Left as free text
       * that produced a fractured Featuring list where one doctor occupied
       * four rows and none of them held all their material.
       *
       * Merging without recording the variants would be worse: the folder
       * name is still the client's own, and a producer who knows the doctor
       * as "Dr. Bales" must still find them. So a merge writes the losing
       * spellings here, and search matches on these as well as on `name`.
       */
      name: "aliases",
      type: "array",
      admin: {
        description:
          "Other spellings this person is filed under. Search matches these too, so merging duplicates never loses a way of finding someone.",
      },
      fields: [{ name: "alias", type: "text", required: true }],
    },
    { name: "role", type: "text", admin: { description: "How to describe them in a caption, e.g. 'Founder', 'Guest'." } },
    { name: "bio", type: "textarea" },
    {
      /**
       * A portrait that does not depend on catalog state.
       *
       * Portraits are otherwise picked from published collections featuring
       * the person, so Love and Legend showed black placeholders for as long
       * as every collection featuring them was held for review — the page
       * silently reflected a moderation decision as an absence of a face.
       */
      name: "portraitUrl",
      type: "text",
      admin: {
        description:
          "Portrait for this person's tile. Paste an absolute image URL. Overrides the frame borrowed from the catalog.",
      },
    },
    {
      name: "portraitImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Or upload a portrait." },
    },
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
  admin: { useAsTitle: "title", defaultColumns: ["title", "year", "awards", "status"], group: "People & Films" },
  access: publicRead,
  fields: [
    { name: "title", type: "text", required: true },
    slug,
    { name: "synopsis", type: "textarea" },
    {
      /**
       * Artwork chosen by hand, independent of the catalog.
       *
       * The tile picture is otherwise borrowed from the best-ranked collection
       * carrying this film — which works until a film has no collections at
       * all. Skin Deep, From Fat Lolli to 6 Pack Lolli and The New Woo have
       * zero, so all three rendered as black placeholders on the front page
       * with no way for anyone to fix it in the CMS. A film exists whether or
       * not its footage has been indexed yet.
       */
      name: "posterUrl",
      type: "text",
      admin: {
        description:
          "Key art for this film's tile. Paste an absolute image URL. Overrides the frame borrowed from the catalog; leave empty to keep borrowing.",
      },
    },
    {
      name: "posterImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Or upload the key art." },
    },

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
  admin: { useAsTitle: "title", defaultColumns: ["title", "startDate", "location"], group: "People & Films" },
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
  admin: { useAsTitle: "label", defaultColumns: ["label", "slug"], group: "People & Films" },
  access: publicRead,
  fields: [
    { name: "label", type: "text", required: true },
    slug,
  ],
};
