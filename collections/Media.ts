import type { CollectionConfig } from "payload";

/**
 * Site furniture — and ONLY site furniture.
 *
 * Read this before uploading anything: the client's 135,611 media files are
 * never migrated, copied or hosted here. That is the first non-negotiable in
 * the brief, and it is what makes this project a catalog rather than a DAM.
 * Their library stays in Drive, Dropbox, Pic-Time and Vimeo, and `Collections`
 * points at it.
 *
 * This collection exists for the handful of images the SITE itself needs and
 * the client's storage does not provide: brand marks, page headers, article
 * hero images, the OG image a link unfurls with. Before this existed there was
 * no way to put a picture on a page at all — every image had to be an external
 * URL — which is not a workable CMS for a brand whose design direction is
 * "real photography only, no stock".
 *
 * Storage is the local disk in development. Production should swap in the S3 or
 * Cloudflare R2 adapter; the client deploys on their own accounts (§9.2), so
 * that choice is theirs to make in the launch guide.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Media", plural: "Media" },
  admin: {
    group: "Library",
    description:
      "Images the site itself needs. NOT the client's asset library — that stays in their own storage and is linked, never uploaded.",
    defaultColumns: ["filename", "alt", "usage"],
  },

  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*", "application/pdf"],
    adminThumbnail: "thumbnail",
    imageSizes: [
      { name: "thumbnail", width: 400, height: 300, position: "centre" },
      { name: "card", width: 768, height: 512, position: "centre" },
      { name: "hero", width: 1920 },
      // Link unfurls want a fixed 1.91:1 (§8 — iMessage, WhatsApp, Slack,
      // LinkedIn, Gmail).
      { name: "og", width: 1200, height: 630, position: "centre" },
    ],
  },

  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === "admin",
  },

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // TereZa is always spelled with a capital Z — explicitly including alt
        // text, which is where it is easiest to forget (§10).
        for (const f of ["alt", "caption", "credit"] as const) {
          if (typeof data[f] === "string") {
            data[f] = data[f].replace(/\bTereza\b/g, "TereZa").replace(/\bTEREZA\b/g, "TereZa");
          }
        }
        return data;
      },
    ],
  },

  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description:
          "What is in the picture, for someone who cannot see it. Required — an image with no alt text fails accessibility and unfurls badly.",
      },
    },
    { name: "caption", type: "text" },
    { name: "credit", type: "text", admin: { description: "Photographer or source." } },
    {
      name: "usage",
      type: "select",
      admin: { description: "Where this is meant to be used. Helps the next editor pick correctly." },
      options: [
        { label: "Page header", value: "header" },
        { label: "Article hero", value: "article" },
        { label: "Brand mark / logo", value: "brand" },
        { label: "Portrait", value: "portrait" },
        { label: "Link preview (OG)", value: "og" },
        { label: "Other", value: "other" },
      ],
    },
  ],
};
