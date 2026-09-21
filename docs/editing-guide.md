# Editing the site

Everything on FAMPIRE is editable in the CMS at **http://localhost:3200/admin**.
Nothing on a public page is hardcoded any more.

## The site is five pages

| Page | URL | What it is |
|---|---|---|
| Landing page | `/` | Hero, search, lanes, statement, films, people, events, magazine, where-to-watch |
| The Library | `/library` | The faceted pool — every collection, filterable |
| Films | `/films` | The slate, with synopses and where to watch |
| People | `/people` | Family profiles and the read-aloud introduction |
| Press | `/press` | The appearance log |

There are no other pages. Six older narrative pages (`/institution`, `/book`,
`/magazine`, `/the-room`, `/clip-them`, `/films/biohack-yourself`) are kept as
**drafts** — nothing ever linked to them, so they are off the public site but
recoverable from **Pages → open one → Publish changes**.

## How a page works

Open **Pages**, pick one, and the whole page is a numbered list of blocks you
can edit, drag to reorder, or delete. **Add Layout** at the bottom adds a new
one. Publish when you are done; **Save Draft** keeps it internal.

This is the whole model. The landing page is nine blocks; the Library is one.

### The blocks

**Structure** — Feature hero (video + rail) · Hero · Statement band (dark) ·
Rich text · Columns · Divider

**The catalog, seen different ways** — Library browser (faceted) · Collection
cards (filtered) · Collection cards (hand-picked) · Films · People · Magazine
shelf · Where to watch · Press log

**Editorial** — Intent lanes · Stat row · Quote · FAQ · Copy-and-paste block ·
Embed · Call to action · Scoped search

Two things worth knowing:

- **Card blocks query the catalog live.** A section showing "event photography"
  cannot go out of date — it is a saved filter, not a copy. Publish a new
  collection and it appears.
- **Stats can be live.** In a Stat row or the Feature hero, set a stat's Source
  to "Live — published collections" and the number is recomputed on every
  request. Typing `516` by hand means it is wrong the week someone publishes
  twelve more.

## The library

**Library → Collections.** One row per collection: a description plus a link to
the client's own storage. We never host their files.

- **Find one** — the search box covers title, description, slug and the
  *original Drive folder name*, so you can search for what the folder is
  actually called as well as what we renamed it to.
- **Filter** — Filters, by any facet. Columns changes what the list shows.
- **Edit or delete** — open the row. Delete is under the ⋯ menu.
- **Add one** — **Create New**, or "Add a collection" from the Library page when
  signed in. Four things are needed: a **title**, a one-line **description**,
  the **link**, and the **kind**. The URL slug and the platform are filled in
  for you. Everything else can wait.

### Tagging — and where the hierarchy comes from

On the **Tagging** tab, in three groups:

| Group | Fields |
|---|---|
| **Who is in it** | People, Crew, Rights holder |
| **What it belongs to** | Film, Event, Magazine issue, Place, Brand |
| **When, and what kind** | Year, dates, Occasion, free tags |

**There is no "parent" field, and that is deliberate.** A collection's parent
*is* its Film, its Event or its Magazine issue. Tag one of those and the
collection files itself underneath it — open the Collections list, choose
**Group by**, and the tree appears: *sHEALed → its 224 collections*,
*Magazines → Issue #5 → its collections*. Nothing is typed twice, and there is
no second hierarchy that can disagree with the tags.

Films, People, Events and Places are records under **Who & What** — create one
there and it becomes both a parent and a filter value the moment a collection
points at it.

Three attribution fields, deliberately separate, because the archive often
records who *shot* something rather than who is *in* it:

- **People** — who appears in the material ("Featuring")
- **Crew** — who shot, cut, produced or directed it
- **Rights holder** — from "owned by X" / "courtesy of X"

### Thumbnails

Most cards use a frame sampled automatically from the source folder. To override
it, set **Preview URL** (paste an image URL) or upload **Preview image**. Either
one beats the sampled frame, on both the card and the collection's own page.

## Other content

| Where | What |
|---|---|
| **Who & What → Films** | Titles, synopses, award counts, years, where-to-watch links |
| **Who & What → People** | Names, roles, bios. `Is minor` drives the child-safety gate |
| **Who & What → Events / Places** | Filter values |
| **Stories → Appearances** | The press log. Title, outlet, date, views, thumbnail |
| **Settings → Navigation & Footer** | The masthead links, footer, search placeholder |
| **Settings → Brands** | The seven brands |
| **Settings → Users** | Accounts and roles |

**Brands are a filter, not a place.** They appear as a facet in the Library and
decide which collections a contributor may edit. No brand has a URL, and HNN is
a separate application, not a brand here.

## Editing from the site

Signed in, every page carries a bar with **Edit "<page>"**, and every collection
card and detail page carries **Edit this collection** — straight to the right
record. Signed out, none of it exists in the markup: public press surfaces are
completely ungated.

## Two rules the CMS enforces for you

- **TereZa always keeps her capital Z.** Rewritten on save, in titles,
  descriptions and alt text, so a hand edit cannot undo it.
- **A collection flagged as containing a minor cannot be published** until a
  person ticks "Contains minor → confirmed", and only an approver or admin may
  tick it. The save is refused otherwise.

## Verifying after a change

```bash
npm run catalog:verify
```

17 invariants — child safety, drafts staying private, TereZa's spelling, facets
actually narrowing, link health, and that no phantom rows are visible to
editors.

```bash
npm run verify:cms
```

18 checks that exercise the editing surface itself: add a collection by hand,
find it by search, filter it, edit it, give it a thumbnail, add and remove a
block, delete it, and confirm the child-safety gate still refuses.

```bash
npm run verify:runtime
```

Loads all eight public pages in a real browser and fails on any client-side
error. **This one is not optional.** A hoisted-function-over-`let` bug in the
hero crashed the landing page for every visitor while the server-rendered HTML
was flawless — correct title, correct stats, 200 on every route. `curl` and an
HTML parser both passed it. Only a browser that executes the page can see a
page that renders and then dies.
