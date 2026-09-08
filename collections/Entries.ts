import type { CollectionConfig } from "payload";

import { brandField } from "./brand";

/** Which storage service a link points at, read off the URL. */
function platformOf(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "drive";
  if (u.includes("dropbox.com")) return "dropbox";
  if (u.includes("pic-time.com") || u.includes("pictime.com")) return "pictime";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (/(netflix|primevideo|amazon|appletv|tubi|plex|roku|hulu)\./.test(u)) return "streaming";
  if (/^https?:\/\//.test(u)) return "site";
  return "unknown";
}

/**
 * The catalog. One row per COLLECTION, never per file.
 *
 * ~1,760 metadata records against 135,611 files — 1.3% (§4.3). That ratio is
 * what makes the project affordable; do not erode it by indexing at file level.
 *
 * Nothing here hosts media. Every row is a description plus a pointer at
 * storage the client already owns, so `url` is the product and link rot is the
 * primary technical risk (§2.1) — which is why `status` and `lastChecked` are
 * first-class fields written by the nightly monitor, not afterthoughts.
 */
export const Entries: CollectionConfig = {
  slug: "entries",
  /**
   * "Entry" is our word for a database row. The media team says "collection",
   * meaning a described pointer at a folder of their material. Renaming the
   * LABEL rather than the slug keeps every existing table, migration, relation
   * and API path intact while the admin speaks their language.
   */
  labels: { singular: "Collection", plural: "Collections" },
  admin: {
    useAsTitle: "title",
    /**
     * NOT film/event as columns — they cannot render.
     *
     * Adding them looked like the obvious fix for "549 collections read as
     * one flat crowd", and it displayed `<No Film>` on every single row,
     * including rows demonstrably carrying film 1 and event 1 in the
     * database. Payload's list view hardcodes `depth: 0`
     * (@payloadcms/next/dist/views/List/index.js), so a relationship column
     * receives a bare id and renders the empty-state label. A column that
     * says "No Film" for 549 rows that all have films is worse than no
     * column: it is a confident wrong answer.
     *
     * Grouping is handled by `groupBy` below instead, which resolves the
     * related titles server-side and is the feature actually designed for
     * this.
     */
    defaultColumns: ["title", "kind", "year", "fileCount", "minorRisk", "_status"],
    /**
     * The hierarchy, without inventing one.
     *
     * "Collections > sHEALed > …" is what was asked for. Real parent-child
     * nesting would mean hand-assigning a parent to 549 rows and then
     * maintaining a second tree that can disagree with Film and Event —
     * which already describe exactly this grouping and are already filled
     * in. `groupBy` uses them directly: pick Film in the list view and
     * sHEALed's 222 collections collect under one heading.
     *
     * Marked experimental by Payload (3.88). It is one boolean, it changes
     * no data, and turning it off restores the plain list — but it is worth
     * knowing it is beta rather than assuming it is settled API.
     */
    groupBy: true,
    group: "Library",
    description:
      "Every collection in the library. Search by title, description or the original folder name; filter by any facet; edit or delete any row. New Collection needs four things — a title, a one-line description, the link, and what kind it is. Everything else can be filled in later. Never migrate, copy or host the client's files; links plus metadata only.",
    /**
     * `rawFolderName` is in here deliberately.
     *
     * The media team knows a collection by what the folder is called in Drive
     * — `6. 6/26/2025 - UFC/ Aires Tech RoundTable` — not by the title we
     * rewrote it to. Searching only the rewritten titles means the one search
     * term they actually have in their head finds nothing.
     */
    listSearchableFields: ["title", "description", "rawFolderName", "slug"],
    pagination: { defaultLimit: 50, limits: [25, 50, 100, 250] },
  },

  // Draft/approve/publish. The public read below only ever sees published
  // documents, so an unfinished edit cannot leak onto a press surface.
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },

  access: {
    /**
     * Public surfaces are completely ungated — no login, no form, no email
     * capture in front of any asset (§2.4). So reads are open, but only for
     * published documents; drafts stay internal.
     */
    read: ({ req }) => {
      if (req.user) return true;
      return { _status: { equals: "published" } };
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => req.user?.role === "admin",
  },

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // TereZa is always spelled with a capital Z — everywhere, including
        // metadata and alt text (§10). Enforced at write time so a hand edit in
        // the admin cannot reintroduce it.
        for (const f of ["title", "description", "altText"] as const) {
          if (typeof data[f] === "string") {
            data[f] = data[f].replace(/\bTereza\b/g, "TereZa").replace(/\bTEREZA\b/g, "TereZa");
          }
        }

        /**
         * Slug written for you when you leave it blank.
         *
         * It is required — every collection needs a URL of its own — but
         * asking a person to hand-author a unique URL-safe string was the
         * single biggest obstacle to adding a collection by hand. Filled from
         * the title only when empty, so an existing slug is never rewritten
         * underneath links that have already been shared.
         */
        if (!data.slug && typeof data.title === "string" && data.title.trim()) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[’']/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);
        }

        /**
         * The platform, read off the URL rather than asked for.
         *
         * It is required and it is always derivable, so making someone pick it
         * from a list of eight is a question with a known answer.
         */
        if (!data.sourcePlatform && typeof data.url === "string") {
          data.sourcePlatform = platformOf(data.url);
        }

        return data;
      },
    ],
    beforeChange: [
      /**
       * Tagging a child IS flagging the entry.
       *
       * The gate below refuses to publish a FLAGGED entry without human
       * confirmation — but nothing connected the flag to the `people` field,
       * so attaching Love or Legend left `containsMinor` false and the entry
       * sailed straight past the gate. A child tagged but unflagged is
       * precisely the false negative §9.1 calls unrecoverable, and it was
       * reachable from the ordinary admin form and from any bulk attribution
       * script.
       *
       * Only ever sets the flag, never clears it: a collection can obviously
       * feature a child nobody has tagged yet, so absence of a tagged minor
       * is not evidence of absence.
       */
      async ({ data, req }) => {
        const ids = (data?.people ?? []) as (number | string | { id?: number | string })[];
        if (!Array.isArray(ids) || ids.length === 0 || data?.containsMinor) return data;
        const norm = ids.map((p) => (typeof p === "object" && p ? p.id : p)).filter(Boolean);
        if (!norm.length) return data;
        const found = await req.payload.find({
          collection: "people",
          where: { id: { in: norm }, isMinor: { equals: true } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        if (found.totalDocs > 0) data.containsMinor = true;
        return data;
      },
      ({ data, req, originalDoc }) => {
        /**
         * The hard stop (§9.1). Love and Legend Lolli are children and appear
         * throughout the library. A false negative publishes a child's image
         * unflagged and is not recoverable — so an entry that is flagged and
         * not yet confirmed simply cannot reach `published`, whoever asks.
         */
        if (data?._status === "published" && data?.containsMinor && !data?.containsMinorConfirmed) {
          throw new Error(
            "This entry is flagged as containing a minor. A person must confirm it (Contains minor → confirmed) before it can be published.",
          );
        }
        /**
         * Only an approver or admin may CONFIRM the flag — i.e. move it from
         * unconfirmed to confirmed. It is the act of confirming that is
         * restricted, not the existence of a confirmation.
         *
         * This used to fire on any truthy value, so every later edit to an
         * already-confirmed entry was refused unless an approver made it:
         * a contributor fixing a typo, or any maintenance script, got
         * "Only an approver or admin may confirm a contains-minor flag" for
         * a field they had not touched. That both blocks ordinary work and
         * teaches people the safety rail is noise — which is how a rail stops
         * being read. Comparing against `originalDoc` restricts exactly the
         * transition that matters and nothing else.
         */
        const confirming = data?.containsMinorConfirmed && !originalDoc?.containsMinorConfirmed;
        if (confirming && !["admin", "approver"].includes(req.user?.role ?? "")) {
          throw new Error("Only an approver or admin may confirm a contains-minor flag.");
        }
        return data;
      },
    ],
  },

  fields: [
    // ── What a reader sees ──────────────────────────────────────────────
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "title",
              type: "text",
              required: true,
              admin: {
                description:
                  "Renamed for strangers. '6. 6/26/2025 - UFC/ Aires Tech RoundTable - Vegas' becomes 'UFC × Aires Tech Roundtable — Las Vegas, June 2025'. This renaming IS the product.",
              },
            },
            {
              /**
               * The shareable identity of a collection.
               *
               * Every entry needs a URL of its own, because §8 requires links
               * to unfurl with a title, description and image in iMessage,
               * WhatsApp, Slack, LinkedIn and Gmail — and you cannot unfurl a
               * link that does not exist. Before this, the Library linked
               * straight out to Drive and no entry was addressable.
               *
               * Human-readable rather than the Drive folder id: a press
               * contact pastes this into an email, and
               * `/collections/1PUVUn9zsQJI...` tells them nothing.
               */
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "The URL for this collection. Changing it breaks links people have already shared.",
              },
            },
            {
              name: "description",
              type: "textarea",
              required: true,
              admin: { description: "One line, human. What is inside and where it came from." },
            },
            {
              /**
               * Required, so it belongs beside the other required fields.
               *
               * This lived on the Facets tab while title, description and url
               * lived here — so filling in this tab and pressing Save produced
               * "The following field is invalid: Facets > Kind", naming a tab
               * the person had never opened. Four required fields split across
               * two tabs is not a validation problem, it is a form-design one.
               */
              name: "kind",
              type: "select",
              required: true,
              index: true,
              admin: { description: "What the asset IS. Required." },
              options: [
                "b-roll", "event photography", "headshots", "poster", "logo",
                "trailer", "BTS", "podcast", "press", "magazine", "document",
                "interview", "audio",
              ].map((v) => ({ label: v, value: v })),
            },
            {
              name: "url",
              type: "text",
              required: true,
              index: true,
              admin: {
                description:
                  "Points at the client's own storage. Use the portable /drive/folders/<id> form — never /drive/u/N/, which encodes a browser account position and breaks for everyone else.",
              },
            },
            {
              name: "rewrittenFrom",
              type: "text",
              admin: { readOnly: true, description: "The original URL, when we canonicalised it." },
            },
            {
              name: "alternates",
              type: "array",
              fields: [{ name: "url", type: "text", required: true }],
              admin: {
                description:
                  "324 subjects exist in more than one folder. The duplicates collapse to one entry; their other locations live here.",
              },
            },
            {
              /**
               * A thumbnail an editor chooses, overriding the sampled frame.
               *
               * The only preview field used to be `previewFileId` — read-only,
               * expecting a Drive file id, written by the orientation sampler.
               * Which meant nobody could give a collection a cover picture by
               * hand: the card for anything the sampler could not read stayed a
               * grey placeholder forever, with no way to fix it in the CMS.
               *
               * Nothing is copied or hosted here — this is a URL, pointing at
               * the client's own storage or their own site, exactly like `url`.
               */
              name: "previewUrl",
              type: "text",
              admin: {
                description:
                  "Optional cover image for this collection's card. Paste an absolute image URL — it overrides the automatically sampled frame. Leave empty to keep the sampled one.",
              },
            },
            {
              name: "previewImage",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  "Or upload one. Page furniture only — never the client's library files, which always stay in their own storage.",
              },
            },
            { name: "altText", type: "text", admin: { description: "For the preview image." } },
          ],
        },

        // ── Filter axes ───────────────────────────────────────────────────
        {
          label: "Facets",
          description: "Two axes must filter simultaneously, and every filter state is URL-addressable.",
          fields: [
            {
                  name: "occasion",
                  type: "select",
                  index: true,
                  admin: { description: "What it came FROM. The second axis." },
                  options: [
                    { label: "Premiere", value: "premiere" },
                    { label: "Book signing", value: "book-signing" },
                    { label: "Clinic production", value: "clinic-production" },
                    { label: "Conference", value: "conference" },
                    { label: "Cover shoot", value: "cover-shoot" },
                    { label: "Roundtable", value: "roundtable" },
                    { label: "Speaking", value: "speaking" },
                    { label: "Festival", value: "festival" },
                    { label: "Interview", value: "interview" },
                    { label: "Workout", value: "workout" },
                    { label: "Podcast", value: "podcast" },
                    // Explicit rather than NULL — see derive.mjs.
                    { label: "Unspecified", value: "unspecified" },
                  ],
            },
            brandField,
            {
              name: "people",
              type: "relationship",
              relationTo: "people",
              hasMany: true,
              index: true,
              admin: {
                description: "Everyone who APPEARS in the material. Crew and rights holders go in their own fields.",
                /**
                 * A grid of faces instead of a 153-name dropdown.
                 *
                 * Only the INPUT is replaced. The field is the same hasMany
                 * relationship writing the same person IDs, so nothing about
                 * the stored data, the API or the read layer changes, and
                 * deleting these three lines restores the stock control.
                 */
                components: {
                  Field: "@/components/admin/PeoplePicker#PeoplePicker",
                },
              },
            },
            {
              /**
               * Who MADE it, as distinct from who is in it.
               *
               * 85 collections credited the BTS cinematographer under
               * "Featuring" because the folder is named `sHEALed BTS Adam
               * Chani Master` — a name that records who shot it. Separating
               * the roles keeps a caption from claiming someone was on camera
               * when the archive only says they held it.
               */
              name: "crew",
              type: "relationship",
              relationTo: "people",
              hasMany: true,
              index: true,
              admin: { description: "Shot, cut, produced or directed it — not necessarily in frame." },
            },
            {
              name: "rightsHolder",
              type: "relationship",
              relationTo: "people",
              hasMany: true,
              index: true,
              admin: { description: 'From "owned by X" / "courtesy of X" in the source folder.' },
            },
            { name: "film", type: "relationship", relationTo: "films", index: true },
            { name: "event", type: "relationship", relationTo: "events", index: true },
            { name: "location", type: "relationship", relationTo: "locations", index: true },
            {
              type: "row",
              fields: [
                { name: "year", type: "number", index: true, admin: { width: "33%" } },
                { name: "dateStart", type: "date", admin: { width: "33%" } },
                { name: "dateEnd", type: "date", admin: { width: "33%", description: "Multi-day events only." } },
              ],
            },
            {
              /**
               * Kept, and no longer the whole story.
               *
               * A bare number cannot say who was on the cover, when the issue
               * ran, or that #6 and #7 are Bryan Johnson and Zachary Levi — so
               * the "magazines → cover star → issue" tree the client asked for
               * had nowhere to live. `issue` below is that tree. This stays as
               * the number the crawl derived and the public issue facet still
               * reads, so nothing on the site depends on the backfill landing.
               */
              name: "magazineIssue",
              type: "number",
              index: true,
              admin: { description: "Derived from the folder path. The Issue relationship below is the editable one." },
            },
            {
              name: "issue",
              type: "relationship",
              relationTo: "magazine-issues",
              index: true,
              admin: {
                description:
                  "Which issue this belongs to. Group the list by this to get Magazines → issue → collections.",
              },
            },
            {
              name: "tags",
              type: "array",
              fields: [{ name: "tag", type: "text", required: true }],
              admin: { description: "Free tags. Never a folder path — tags, so one entry can sit under many lenses." },
            },
          ],
        },

        // ── Child safety ──────────────────────────────────────────────────
        {
          label: "Safety",
          description: "Nothing on this tab may be automated away. A person decides.",
          fields: [
            {
              name: "minorRisk",
              type: "select",
              defaultValue: "none",
              index: true,
              admin: {
                description:
                  "Review priority, drafted from the folder path. 'none' means the path told us nothing — it is NOT a clearance.",
              },
              options: [
                { label: "Named — a child is named or a kids/family hint fired", value: "named" },
                { label: "Context — a setting the family attends together", value: "context" },
                { label: "None — no signal either way", value: "none" },
              ],
            },
            {
              name: "containsMinor",
              type: "checkbox",
              defaultValue: false,
              index: true,
              admin: { description: "DRAFT flag. Never treat as decided." },
            },
            {
              name: "containsMinorConfirmed",
              type: "checkbox",
              defaultValue: false,
              admin: {
                description:
                  "Confirmed by a person. An entry flagged and not confirmed CANNOT be published — the save will be refused.",
              },
            },
            { name: "safetyNote", type: "textarea", admin: { description: "Internal. Who confirmed, and what they checked." } },
          ],
        },

        // ── Link health ───────────────────────────────────────────────────
        {
          label: "Health",
          description:
            "Link rot is the primary technical risk of a catalog architecture. Written nightly by the monitor.",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "sourcePlatform",
                  type: "select",
                  required: true,
                  defaultValue: "drive",
                  index: true,
                  admin: { width: "50%" },
                  options: ["drive", "dropbox", "pictime", "vimeo", "youtube", "streaming", "site", "unknown"]
                    .map((v) => ({ label: v, value: v })),
                },
                {
                  name: "access",
                  type: "select",
                  required: true,
                  defaultValue: "public",
                  index: true,
                  admin: { width: "50%" },
                  options: [
                    { label: "Public", value: "public" },
                    { label: "Password", value: "password" },
                    { label: "Request", value: "request" },
                    { label: "Broken", value: "broken" },
                  ],
                },
              ],
            },
            {
              name: "accessNote",
              type: "text",
              admin: {
                description:
                  "Internal only. Passwords live here and are NEVER rendered on a public surface.",
                condition: (data) => data?.access === "password" || data?.access === "request",
              },
            },
            {
              /**
               * NOT `status`. Payload's drafts feature owns `_status`, and both
               * names generate the Postgres enum type `enum_entries_status` —
               * so a plain `status` field silently produced a migration that
               * declared the column with the DRAFT enum ('draft','published')
               * and a default of 'unchecked', which Postgres rejects.
               */
              name: "linkStatus",
              type: "select",
              defaultValue: "unchecked",
              index: true,
              admin: {
                readOnly: true,
                description:
                  "'unchecked' means the sweep has not run, NOT that the link is fine. A Drive folder that returns 200 but redirects to sign-in is not healthy.",
              },
              options: ["unchecked", "ok", "gone", "login-required", "password", "timeout", "blocked"]
                .map((v) => ({ label: v, value: v })),
            },
            { name: "linkStatusDetail", type: "text", admin: { readOnly: true } },
            { name: "lastChecked", type: "date", admin: { readOnly: true } },
          ],
        },

        // ── Shape and provenance ──────────────────────────────────────────
        {
          label: "Provenance",
          description: "Where this came from in the client's Drive. Internal.",
          fields: [
            {
              type: "row",
              fields: [
                { name: "fileCount", type: "number", admin: { width: "50%" } },
                {
                  name: "dominantMedia",
                  type: "select",
                  admin: { width: "50%" },
                  options: ["image", "video", "document", "audio", "vector", "other"].map((v) => ({ label: v, value: v })),
                },
              ],
            },
            {
              name: "mediaMix",
              type: "group",
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "image", type: "number", admin: { width: "33%" } },
                    { name: "video", type: "number", admin: { width: "33%" } },
                    { name: "document", type: "number", admin: { width: "33%" } },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    { name: "audio", type: "number", admin: { width: "33%" } },
                    { name: "vector", type: "number", admin: { width: "33%" } },
                    { name: "other", type: "number", admin: { width: "33%" } },
                  ],
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "orientation",
                  type: "select",
                  admin: {
                    width: "50%",
                    description:
                      "Measured by sampling real thumbnails. Empty means the sampler could not read a frame (a folder of RAW negatives Drive will not render) — NOT a claim of landscape.",
                  },
                  options: [
                    { label: "Landscape", value: "landscape" },
                    { label: "Portrait / vertical", value: "portrait" },
                    { label: "Mixed", value: "mixed" },
                    { label: "Square", value: "square" },
                  ],
                },
                {
                  name: "resolutionClass",
                  type: "select",
                  admin: {
                    width: "50%",
                    description:
                      "Pic-Time serves web-resolution only. Print teams need 300 DPI CMYK — flag it rather than pretending otherwise.",
                  },
                  options: [
                    { label: "Web only", value: "web" },
                    { label: "Print (300 DPI)", value: "print" },
                    { label: "Unknown", value: "unknown" },
                  ],
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "orientationConfidence",
                  type: "number",
                  admin: {
                    width: "50%",
                    readOnly: true,
                    description: "Share of sampled frames agreeing. 1 = unanimous.",
                  },
                },
                {
                  name: "orientationSamples",
                  type: "number",
                  admin: {
                    width: "50%",
                    readOnly: true,
                    description: "Frames actually read. Under 3 is provisional.",
                  },
                },
              ],
            },
            {
              /**
               * A Drive file id we have PROVEN renders a thumbnail — the frame
               * used for this collection's link preview. Verified by the
               * orientation sampler rather than assumed, because a preview
               * pointing at a 404 is worse than no preview.
               */
              name: "previewFileId",
              type: "text",
              admin: { readOnly: true, description: "Drives the link-unfurl image." },
            },
            { name: "folderId", type: "text", admin: { readOnly: true } },
            {
              name: "folderPath",
              type: "text",
              admin: {
                readOnly: true,
                description:
                  "The client's own folder ancestry, verbatim — including their spelling. Kept unaltered so the audit trail does not lie about what we found.",
              },
            },
            { name: "rawFolderName", type: "text", admin: { readOnly: true } },
            {
              name: "duplicateFolders",
              type: "number",
              defaultValue: 1,
              admin: { readOnly: true, description: "How many copies of this subject the crawl found." },
            },
            {
              name: "importDisposition",
              type: "select",
              admin: {
                readOnly: true,
                description: "Why the importer did or did not put this forward for review.",
              },
              options: [
                { label: "Publish — qualifies for review", value: "publish" },
                { label: "Merge — real content, wrong granularity", value: "merge" },
                { label: "Reject — machine output", value: "reject" },
              ],
            },
            { name: "holdReason", type: "text", admin: { readOnly: true } },
          ],
        },
      ],
    },
  ],
};
