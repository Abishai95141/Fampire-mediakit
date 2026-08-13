import type { CollectionConfig } from "payload";

/**
 * The tenant collection. One Payload install serves the whole institution
 * (build plan §2.2) — FAMPIRE is the umbrella, not a company, and the worlds
 * sit under it.
 *
 * All eight brand records are created at build time, including the five with
 * no assets yet. Empty brands cost nothing; retrofitting tenancy later means
 * touching every table and query against live data.
 *
 * The compounding promise is that adding a world is: create a record, paste
 * links, publish — no deploy. Nothing in here may hard-code the list.
 *
 * HNN is NOT one of these. It is a separate application with its own database
 * and its own CMS, and it is kept that way deliberately (see scripts/seed-brands.ts).
 */
export const Brands: CollectionConfig = {
  slug: "brands",
  labels: { singular: "Brand", plural: "Brands" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "hasAssets"],
    /**
     * A setting, not a place.
     *
     * These sat in a sidebar group called "The Worlds", alongside Pages — which
     * promised that each world was somewhere a reader could go. None of them
     * has a URL and none ever did: a brand is a FILTER on the one library, and
     * the boundary that decides which collections a contributor can edit. The
     * group name was the single most misleading thing in the admin.
     */
    group: "Settings",
    description:
      "A lens on the one library, not a separate site. Brands appear as a filter in the Library and decide which collections a contributor can edit — they are not pages and have no URL of their own.",
  },
  access: {
    // Brand names and slugs drive public routing, so reads are open.
    read: () => true,
    create: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => req.user?.role === "admin",
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { description: "URL segment, e.g. `fampire` → /fampire" },
    },
    {
      name: "tagline",
      type: "text",
      admin: { description: "One line, shown on the brand card." },
    },
    {
      name: "hasAssets",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Five of the eight worlds shipped with zero assets. Unchecked keeps the card visible but the surface shallow.",
      },
    },
  ],
};
