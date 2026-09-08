import type { Field } from "payload";

/**
 * Which brand a record belongs to.
 *
 * This replaces the field the multi-tenant plugin used to inject. Same name,
 * so it maps to the same `tenant_id` column and every existing value survives
 * untouched — the change is a no-op for the database and a large one for the
 * person using the admin.
 *
 * Three deliberate differences from what the plugin gave us:
 *
 *  1. NOT REQUIRED. The plugin made it mandatory, which is why importing the
 *     press log failed with "Assigned Tenant — This field is required" on a
 *     fact the archive does not record. A brand is useful metadata, not a
 *     precondition for logging something.
 *  2. NO GLOBAL FILTER. Choosing a brand here labels one record. It does not
 *     silently hide every other record in the admin, which is what the
 *     sidebar's tenant selector did.
 *  3. IT SAYS "BRAND". The label matched the plugin's vocabulary ("Assigned
 *     Tenant"), a word that appears nowhere in this project or the client's.
 */
export const brandField: Field = {
  name: "tenant",
  label: "Brand",
  type: "relationship",
  relationTo: "brands",
  index: true,
  admin: {
    description:
      "Which world this belongs to. A label and a filter on the one shared library — it does not hide anything from anyone.",
    /**
     * The client's "publishers", picked the same way as the people.
     *
     * Brands carry a name and a tagline and no artwork, so these tiles are
     * wordmarks rather than pictures — which is how the brands read on the
     * public site as well, instead of a broken-image placeholder standing in
     * for a logo that was never uploaded.
     *
     * `hasMany: false`: this is one brand per collection, so picking replaces
     * and picking the chosen one clears it.
     */
    components: {
      Field: {
        path: "@/components/admin/RecordPicker#RecordPicker",
        clientProps: {
          collection: "brands",
          hasMany: false,
          heading: "Which brand publishes this",
        },
      },
    },
  },
};
