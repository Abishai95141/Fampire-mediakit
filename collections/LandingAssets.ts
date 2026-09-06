import type { CollectionConfig } from "payload";

/**
 * The landing page's own picture bucket.
 *
 * Deliberately NOT the Media collection and deliberately NOT People
 * portraits. A hero card, a section background, a wordmark's artwork — these
 * are compositional choices about one page. Storing them next to a person's
 * canonical portrait means changing the page changes the person, which is
 * exactly the coupling this whole exercise has been removing.
 *
 * So: its own collection, its own list in the admin, and a `usedFor` label so
 * an editor opening it can tell at a glance which section an image belongs to
 * rather than guessing from a filename.
 *
 * Still not the client's asset library. The 135,611 files in Drive and
 * Dropbox stay where they are and are LINKED — this holds only the handful of
 * images the landing page itself composes with.
 */
export const LandingAssets: CollectionConfig = {
  slug: "landing-assets",
  labels: { singular: "Landing image", plural: "Landing images" },
  admin: {
    useAsTitle: "title",
    group: "Settings",
    defaultColumns: ["title", "usedFor", "updatedAt"],
    description:
      "Pictures the landing page composes with — hero cards, section backgrounds, anything that is a page decision rather than a record. Changing one here never changes a Person, Film or Brand.",
  },
  upload: {
    staticDir: "public/landing",
    mimeTypes: ["image/*"],
    /**
     * Two sizes, not five. These are hero-scale pictures on one page; a wall
     * of derivative crops would cost storage and buy nothing, since every
     * surface that uses them renders full-bleed or near it.
     */
    imageSizes: [
      { name: "card", width: 900, height: undefined, position: "centre" },
      { name: "wide", width: 2200, height: undefined, position: "centre" },
    ],
  },
  access: {
    // Public read: these are the pictures on the public landing page.
    read: () => true,
    create: ({ req }: { req: { user?: unknown } }) => Boolean(req.user),
    update: ({ req }: { req: { user?: unknown } }) => Boolean(req.user),
    delete: ({ req }: { req: { user?: { role?: string } | null } }) => req.user?.role === "admin",
  },
  fields: [
    {
      name: "title",
      type: "text",
      admin: { description: "What this picture is, in plain words. Shown in the picker." },
    },
    {
      name: "usedFor",
      type: "select",
      admin: { description: "Which section this was uploaded for. Only a label — nothing enforces it." },
      options: [
        { label: "Hero cards", value: "hero" },
        { label: "Statement background", value: "statement" },
        { label: "People", value: "people" },
        { label: "Films", value: "films" },
        { label: "Press", value: "press" },
        { label: "Lately", value: "lately" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "alt",
      type: "text",
      admin: {
        description:
          "Describe the picture for someone who cannot see it. Left empty, the card's own name is used.",
      },
    },
    {
      name: "credit",
      type: "text",
      admin: { description: "Photographer or source, where one is owed." },
    },
  ],
};
