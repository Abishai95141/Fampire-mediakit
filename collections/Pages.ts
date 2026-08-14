import type { CollectionConfig } from "payload";

import { PAGE_BLOCKS } from "./blocks";
import { brandField } from "./brand";

/**
 * Every page on the site, including the ones that used to be code.
 *
 * The site is five surfaces: the landing page, the Library, Films, People and
 * Press. All five are records here, assembled from `collections/blocks.ts` —
 * there is no longer such a thing as a page a developer has to change. That
 * matters more than it sounds: while the landing page and the Library were
 * hardcoded React files, "select a page and edit its blocks" was true only of
 * six narrative pages nobody had ever linked to, so the page builder looked
 * like a feature that did not apply to the real site.
 *
 * Tenant-scoped, so a contributor assigned to one brand edits only its pages.
 * The brand is NOT a URL segment and never was a place — see collections/
 * Brands.ts.
 */
export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    // Its own group, at the top. Pages are the thing an editor opens first.
    group: "Pages",
    description:
      "The site is five pages: the landing page, the Library, Films, People and Press. Open one, and everything on it is a block you can edit, reorder or remove — add a new one with “Add Layout” at the bottom.",
    livePreview: {
      url: ({ data }) => {
        const path = String(data?.slug ?? "").replace(/^\/?/, "/");
        return `${process.env.SITE_URL ?? "http://localhost:3200"}${path}`;
      },
    },
  },

  versions: { drafts: { autosave: false }, maxPerDoc: 30 },

  access: {
    // Ungated public surfaces (§2.4) — but drafts stay internal.
    read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === "admin",
  },

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // TereZa, always with a capital Z (§10).
        for (const f of ["title", "seoTitle", "seoDescription"] as const) {
          if (typeof data[f] === "string") {
            data[f] = data[f].replace(/\bTereza\b/g, "TereZa").replace(/\bTEREZA\b/g, "TereZa");
          }
        }
        // Normalise the path so "/press", "press" and "press/" are one page.
        if (typeof data.slug === "string") {
          data.slug = `/${data.slug.trim().replace(/^\/+|\/+$/g, "")}`;
        }
        return data;
      },
    ],
  },

  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Page",
          fields: [
            { name: "title", type: "text", required: true },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: { description: "The URL path, e.g. /fampire/press. Leading slash is added for you." },
            },
            brandField,
            {
              name: "layout",
              type: "blocks",
              required: true,
              minRows: 1,
              blocks: PAGE_BLOCKS,
              admin: {
                description:
                  "Narrative sections embed real collection cards rather than describing them in prose — so a page can never drift out of date relative to the catalog.",
              },
            },
          ],
        },
        {
          label: "SEO",
          description:
            "URLs must unfurl with title, description and image in iMessage, WhatsApp, Slack, LinkedIn and Gmail — which is why these render server-side.",
          fields: [
            { name: "seoTitle", type: "text" },
            { name: "seoDescription", type: "textarea" },
            {
              name: "seoImage",
              type: "text",
              admin: { description: "Absolute URL. Real photography only — no stock, no illustration substitutes." },
            },
            {
              name: "noIndex",
              type: "checkbox",
              defaultValue: false,
              admin: { description: "Keep this page out of search engines." },
            },
            {
              name: "seoNote",
              type: "text",
              admin: {
                description:
                  "Competitors are never named, referenced or disparaged — this includes SEO copy. Hard client rule.",
              },
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Site-wide furniture that is not a page: navigation, the footer, the strings
 * on surfaces that are rendered by code rather than assembled from blocks.
 *
 * Modelled as a tenant-aware "global" so each brand can have its own nav
 * without a code change.
 */
export const SiteSettings: CollectionConfig = {
  slug: "site-settings",
  labels: { singular: "Navigation & Footer", plural: "Navigation & Footer" },
  admin: {
    useAsTitle: "label",
    group: "Settings",
    description: "The links in the masthead and the footer, plus the search placeholder.",
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    { name: "label", type: "text", required: true },
    brandField,
    {
      name: "nav",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
        {
          name: "children",
          type: "array",
          fields: [
            { name: "label", type: "text", required: true },
            { name: "href", type: "text", required: true },
          ],
        },
      ],
    },
    {
      name: "footer",
      type: "group",
      fields: [
        { name: "blurb", type: "textarea" },
        {
          name: "links",
          type: "array",
          fields: [
            { name: "label", type: "text", required: true },
            { name: "href", type: "text", required: true },
          ],
        },
        {
          name: "trademarkNote",
          type: "text",
          admin: { description: "FAMPIRE®, WYNX®, HNN®, BIOHACK YOURSELF®, World's Top Dentist™." },
        },
      ],
    },
    {
      name: "searchPlaceholder",
      type: "text",
      defaultValue: "Search films, people, events and collections",
    },
  ],
};
