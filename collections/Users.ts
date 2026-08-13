import type { CollectionConfig } from "payload";

/**
 * The only authenticated surface in this project.
 *
 * Public press-room surfaces are ungated by design (build plan §2.4) — no
 * login, no form, no email capture in front of any asset. These accounts exist
 * solely for the internal media team working in /admin.
 *
 * Roles map to the approval workflow in §12 stage 3:
 *   admin       — everything, including publishing and user management
 *   approver    — may publish, and may confirm contains_minor (§9.1)
 *   contributor — may draft, may not publish
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: { useAsTitle: "email", defaultColumns: ["email", "name", "role"], group: "Settings" },
  access: {
    // Only admins manage accounts; everyone signed in can read the roster so
    // the admin UI can render "last edited by".
    create: ({ req }) => req.user?.role === "admin",
    delete: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => req.user?.role === "admin",
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "contributor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Approver", value: "approver" },
        { label: "Contributor", value: "contributor" },
      ],
    },
  ],
};
