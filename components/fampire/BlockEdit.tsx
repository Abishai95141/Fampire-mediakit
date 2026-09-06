import Link from "next/link";

/**
 * The per-section editing handle, for signed-in admins only.
 *
 * The page builder was already there, but finding it meant knowing to go to
 * /admin, knowing the front door is a "page", and knowing which of fourteen
 * blocks draws the thing you are looking at. So in practice nobody edited the
 * landing page. This puts the door next to the room: hover a section, get a
 * link straight to the words, and a second link to the RECORDS behind it.
 *
 * That second link is the point. Most sections are not editable as text at
 * all — the four faces in the hero are People, the wordmarks are Brands, the
 * slate is Films. Changing a portrait, adding a fifth family member or
 * pointing a brand somewhere else happens in the collection, not on the page,
 * and there was previously nothing on the site that said so.
 *
 * Signed-out visitors get NOTHING: this renders null rather than hiding with
 * CSS, so no admin URL is ever in public markup.
 */

/** What each section actually draws from, and therefore where its content
 *  lives. `null` means the block is only words on the page itself. */
const SOURCE: Record<string, { label: string; slug: string } | null> = {
  deckHero: { label: "People", slug: "people" },
  brandStrip: { label: "Brands", slug: "brands" },
  statementSplit: { label: "People", slug: "people" },
  recapRow: null,
  peopleRow: { label: "People", slug: "people" },
  filmStrip: { label: "Films", slug: "films" },
  pressList: { label: "Appearances", slug: "appearances" },
  magazineShelf: { label: "Magazine issues", slug: "magazine-issues" },
  watchGrid: { label: "Films", slug: "films" },
  entryQuery: { label: "Collections", slug: "entries" },
  entryPicks: { label: "Collections", slug: "entries" },
  libraryBrowser: { label: "Collections", slug: "entries" },
  lanes: null,
  statement: null,
  searchBar: null,
  hero: null,
  heroFeature: null,
};

const TITLE: Record<string, string> = {
  deckHero: "Hero",
  brandStrip: "The worlds",
  statement: "Institution",
  statementSplit: "Statement",
  recapRow: "Lately",
  lanes: "Intent lanes",
  filmStrip: "Films",
  peopleRow: "People",
  pressList: "Press",
  entryQuery: "Collections",
  magazineShelf: "Magazine",
  watchGrid: "Where to watch",
  searchBar: "Search",
};

export default function BlockEdit({
  signedIn,
  pageId,
  blockType,
}: {
  signedIn: boolean;
  pageId: number | string;
  blockType: string;
}) {
  if (!signedIn) return null;
  const src = SOURCE[blockType];
  const name = TITLE[blockType] ?? blockType;

  return (
    <div
      className="fam-block-edit print:hidden"
      /* Absolutely placed against the section, which is why every block that
         uses this is given `position: relative` in the same commit. */
      data-block={blockType}
    >
      <span className="fam-block-edit-tag">{name}</span>
      <Link href={`/admin/collections/pages/${pageId}`} prefetch={false}>
        Edit words
      </Link>
      {src ? (
        <>
          <Link href={`/admin/collections/${src.slug}`} prefetch={false}>
            {src.label}
          </Link>
          <Link href={`/admin/collections/${src.slug}/create`} prefetch={false}>
            + Add
          </Link>
        </>
      ) : null}
    </div>
  );
}
