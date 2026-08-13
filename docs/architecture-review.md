# Architecture review

State of the build, measured against `BUILD-PLAN.md`.

> **Status: the findings below have been acted on.** The seam is crossed, the
> brand is a route parameter, authentication is unified, and the missing
> content types exist. The original findings are kept in full because they
> explain *why* the architecture looks the way it does — see "What changed"
> at the end for what is now true.

## The headline (as found)

**The site and the CMS were two disconnected systems.**

```
data/fampire/catalog.json   94 entries   ← the website renders THIS
Payload / Postgres         559 entries   ← everything we just built lives HERE
```

Zero application code outside `app/(payload)/` imports Payload. The 559
enriched entries, the eight brands, the 150 people, the orientation sampling,
the 16-block page builder — none of it reaches a visitor. The site today is
byte-identical in behaviour to the day it was extracted.

That is not a bug; stage 2 of the build sequence was never started. But it does
mean **every claim about the catalog is currently a claim about the database,
not about the website.**

---

## 1. What is built

| Area | State |
|---|---|
| Front end (7 routes, design system) | Working, unchanged, renders 94 static entries |
| Payload 3.88 on Postgres, Next 16 | Installed, migrated, verified |
| Multi-tenancy (8 brands) | Modelled and seeded |
| Catalog model (`Entries`, 5 tabs) | Modelled, 559 rows imported, 341 published |
| Enrichment pipeline | Reproducible, idempotent, documented |
| Orientation sampling | 90% coverage, vertical filtering works **in the API** |
| Child-safety gate | Enforced and tested against admin override |
| Taxonomy (People/Films/Events/Locations) | Modelled and populated |
| Page builder (16 blocks) | Modelled — **nothing renders it** |
| Draft/approve/publish + RBAC | Modelled — **no user accounts exist** |
| Link health monitor | **Not built** |
| Public site reading from CMS | **Not built** |
| `/hnn` mount | **Not built** |
| Media uploads | **Not built** |

---

## 2. Routing — the real problem

### What exists

```
/                          institution home        static
/fampire                   brand home              static, hardcoded directory
/fampire/{films,people,press,library,login}
/admin                     Payload
/payload-api/*             Payload REST + GraphQL
/api/auth                  501 stub
```

### Four things wrong with it

**1. The brand is a directory, but brands are database records.**

`app/(frontend)/fampire/` is a folder on disk. Zanzi, WYNX, Lolli Holdings,
Lolli Family Office and Lolli Lifestyle are rows in Postgres with no route.
Giving Zanzi a page means creating `app/(frontend)/zanzi/` and deploying.

That contradicts the one promise the whole multi-tenant design exists to keep:

> Adding brand #9 must be: create a record, paste links, publish. No deploy.
> — §2.2

We built tenancy into the database and then hardcoded the tenant into the URL.
The compounding promise is currently unkept.

**2. Two API namespaces, for a reason that no longer applies.**

`/api/auth` (app) and `/payload-api/*` (CMS) exist side by side because
`LoginForm.tsx` hardcodes `/api/auth` and §2.6 flagged it as "the one coupling
no compiler catches". That was the right call while the front end was
untouchable. It is now a permanent oddity guarding a string we control and can
change before anything is live.

**3. The page builder is unreachable.**

`Pages` can produce a page at any slug, with SEO and live-preview configured.
There is no catch-all route rendering it, so every CMS-authored page 404s.
**Customisation is 0% available to a user despite being fully modelled.**

**4. `/hnn` does not exist.**

§6 requires `/hnn/*`. The brand record exists with `external: true` and
`externalHref: "/hnn"`, pointing at nothing.

### Recommended structure

```
/                              institution home — the eight worlds
/[brand]                       brand home            ← one dynamic segment, DB-resolved
/[brand]/library               the faceted pool; every filter URL-addressable
/[brand]/collections/[slug]    one collection (detail page — currently missing entirely)
/[brand]/{people,films,events} lens pages
/[brand]/[...slug]             CMS Pages catch-all   ← makes the page builder real
/hnn                           resolved from the brand record → the gated app
/admin                         Payload
/payload-api/*                 Payload REST + GraphQL
/api/*                         app endpoints (session)
```

One change carries most of the value: **replace the `fampire/` directory with
`[brand]/` and resolve the brand from Postgres.** Then Zanzi works the moment
someone creates the record, `/hnn` resolves through the same mechanism as every
other world (redirecting out to the gated app rather than rendering), and
`generateStaticParams` can still prerender the brands that exist at build time.

Note there is currently **no detail page for a single collection at all** — the
Library links straight out to Drive. That is defensible under §4.5 rule 5
("stop at the collection"), but it means no catalog entry has a shareable URL,
which conflicts with the §8 criterion that URLs unfurl in iMessage, WhatsApp,
Slack, LinkedIn and Gmail. You cannot unfurl a link you do not have.

---

## 3. Payload — strong model, three real gaps

The modelling is good: tabs, indexes on every filter axis, drafts with
versions, per-collection access control, tenancy, and business rules enforced
in hooks rather than documented in a wiki. The child-safety gate refusing an
`overrideAccess: true` publish is the kind of thing that survives contact with
a hurried human.

What is missing is not depth. It is **whole content types**.

**No `Media` collection.** There is no upload collection anywhere, so an editor
cannot upload a single image — not a hero, not a brand mark, not an OG image.
`seoImage` is a free-text URL field. For a brand whose design direction is
"real photography only — no stock", a CMS that cannot accept a photograph is a
serious gap. `sharp` is already installed for exactly this.

**No `Articles` / press-release type.** `press` and `magazine` are *kinds* on
`Entries`, meaning "a link to a folder of press material". They cannot hold a
written piece. §6 asks for "The Magazine" and "The Press" as narrative
sections; the magazine has 8 issues with named cover subjects (Bryan Johnson,
Zachary Levi, Gary Brecka, Lara Trump…) that deserve records, not a
`magazineIssue` integer.

**No `Appearances` collection**, despite `data/fampire/appearances.json`
existing and §8 setting a hard criterion: *"A new appearance is logged in <2 min
and appears publicly."* Today there is nowhere to log one.

Also missing, lower stakes: the link-health monitor that writes `linkStatus`
(§5.2 calls it "a required feature, not tooling" — every entry currently reads
`unchecked`), and `resolutionClass`, which stays unsolved per §7.7.

---

## 4. Authentication — genuinely inconsistent

There are **three** notions of identity, and none of them are connected.

| | Where | State |
|---|---|---|
| `isSignedIn()` | `lib/fampire/auth.ts` | hardcoded `return false` |
| `POST /api/auth` | app route | 501 stub; `LoginForm` posts here |
| Payload auth | `/admin` | real, cookie-based, working |

Consequences today: signing into `/admin` leaves you signed *out* on the site.
`/fampire/login` is a page that cannot succeed. Zero users exist, so the RBAC
we modelled has never been exercised by a real account.

**These should be one system.** The people who log in are the same people:
the internal media team. The fix is small and removes the whole class of
discrepancy:

- `isSignedIn()` reads Payload's session (`payload.auth({ headers })`).
- `POST /api/auth` calls `payload.login()` and sets the Payload cookie.
- One user table, one cookie, one session, one place roles are defined.

Worth being explicit about what login is *for*, because §2.4 is absolute:
**public press surfaces are ungated, permanently.** Login exists only so the
internal team can see held-back (`private`) collections and work in the admin.
It must never become a gate in front of a public asset.

### HNN

**Intact — but only because nothing has touched it.** `~/HNN` is a separate
repository, separate database, separate CMS, unmodified, still on
`feat/green-brand-ui-refresh` at `d9d3afa`. Nothing in this repo imports it.

There is an unresolved contradiction in the brief itself, and it should be
settled before anyone builds the mount:

- `CLAUDE.md`: "Mount it at `/hnn/*` via proxy + shared auth secret."
- `BUILD-PLAN.md` §2.3: "HNN and FAMPIRE share one codebase… no proxy, no
  cross-app auth handshake."
- `BUILD-PLAN.md` §6: "`/hnn/*` PROXIED to the existing HNN app (gated)."

Given HNN keeps its own Drizzle schema and studio, and this app now owns a
Payload install, **the proxy reading is the safer one** — it keeps HNN intact,
which is the stated non-negotiable. A shared auth secret across two identity
systems is the part most likely to create exactly the discrepancy this review
is asking about; a link-out from the brand card avoids it entirely and costs
the user one sign-in.

---

## 5. Customisation — modelled, not delivered

The page builder is genuinely capable: hero, rich text, live filtered
collection cards, hand-picked cards, intent lanes, live stats, film strip,
people row, quote, FAQ, copy-paste blocks, embed, CTA, scoped search, columns,
divider. Filtered card blocks query the catalog live, so a narrative page
cannot drift from the entries it describes.

**None of it is reachable.** Until a `[...slug]` route renders `Pages`, an
editor can build a page and never see it.

Beyond the missing route, the real limits on what a user can configure:

- **No navigation editing in practice** — `SiteSettings` models nav and footer,
  but the site's shell is hardcoded and does not read it.
- **No theming** — colours and type are in `globals.css`. A new brand cannot
  have its own palette without a code change, which will bite the moment
  world #9 arrives.
- **No media library**, so every image in a page must be an external URL.
- **No reordering of the lens pages** — `/fampire/films`, `/people`, `/press`
  are fixed routes, not content.

---

## 6. Is it intuitive? Not yet.

The test the client will apply: *can someone open the admin and find the thing
they are thinking of, without knowing how we built it?*

Current admin navigation:

```
Catalog    → Entries
Content    → Pages, Site Settings
Taxonomy   → People, Films, Events, Locations
(ungrouped)→ Users, Brands
```

Three problems:

1. **"Entries" is our word.** A media team thinks *Collections*, or *Media
   Library*. "Entry" describes a database row, not a thing they own.
2. **"Taxonomy" is a technical term.** People, Films and Events are not
   metadata to this client — they are the subject of the business. Filing them
   under a word borrowed from library science hides them.
3. **The types they will look for are absent.** Someone will look for *Media*,
   *Articles*, *News*, *Press releases*, *Magazine issues*, *Appearances* —
   and find none of them.

A grouping that matches how they actually talk:

```
Library      → Collections (was Entries), Media
Stories      → Articles, Magazine Issues, Appearances
The Worlds   → Brands, Pages, Navigation & Footer
Who & What   → People, Films, Events, Places
Settings     → Users
```

Same data, renamed and regrouped — mostly `admin.group` and label changes, plus
the three missing collections.

---

## 7. Verdict

**Robust:** yes, where it exists. The data model, the enforced invariants, the
migrations-as-truth discipline and the 13 live-data checks are production-grade.
The enrichment pipeline is reproducible and honest about its own limits.

**Extensible:** partly. Tenancy is real in the database and absent from the
URLs, which is the single biggest structural debt. Content types are missing
rather than badly modelled — additive work, not rework.

**Intuitive:** not yet, and not close. A visitor sees a site that knows nothing
about the CMS; an editor sees a CMS whose vocabulary is ours.

**The gap is not quality. It is connection.** Almost everything needed exists
on one side or the other of a seam nobody has crossed yet.

### Order that de-risks fastest

1. **Cross the seam.** Rewrite `lib/fampire/catalog.ts` to query Payload. The
   front end must keep working untouched — if it does not, the seam was wrong,
   and §12 says find that out now rather than on day eight.
2. **`[brand]/` routing + `[...slug]` Pages catch-all.** Keeps §2.2's promise
   and makes the page builder real in one move.
3. **One identity.** Point `isSignedIn()` and `/api/auth` at Payload; create
   the first admin user.
4. **The missing content types.** Media, Articles, Magazine Issues,
   Appearances — plus the admin renaming above.
5. **Link-health monitor**, so `linkStatus` stops lying at `unchecked`.
6. **`/hnn`**, once the proxy-vs-shared-codebase contradiction is settled.


---

## What changed

Everything in §2–§6 above has been addressed. Verified end to end.

**The seam is crossed.** `lib/fampire/catalog.ts` no longer imports JSON; it is
pure functions over an `Entry[]` supplied by `lib/fampire/payload-catalog.ts`.
The masthead reads 341 — Payload's published count — and no title unique to
the old 94-row file survives anywhere on the site.

§2.6 predicted the pages would be untouched. **They were not**, and that is the
finding worth keeping: the facet and search functions took an `Entry[]` already
and needed nothing, but four helpers closed over the module-level array and
every page read `ENTRIES` as a synchronous constant. A constant cannot become a
query without its callers awaiting it. The seam was in roughly the right place;
it was not free. Stage 2 exists to discover exactly that, early.

**The brand is a route parameter.** `app/(frontend)/[brand]/` resolves against
Postgres, so all seven world routes answer 200 with no code for any of them,
an unknown slug 404s, and reserved segments (`admin`, `payload-api`) are held
back. Catalogs are tenant-scoped and measurably different — lolli-brands 494
cards, biohack-yourself 188, zanzi 0. §2.2's promise is now kept.

`/` became the institution home listing the worlds, rather than a redirect to a
hardcoded `/fampire`. Note the consequence: **there is no `/fampire` route**,
because FAMPIRE is the umbrella above the eight worlds (§10), not one of them.

**`/[brand]/[...slug]` renders CMS pages**, so the 16-block builder is reachable
for the first time. Real files (`library`, `films`, `people`, `press`) win over
the catch-all, so an editor cannot shadow a built surface.

**One identity.** `isSignedIn()` reads Payload's session; `POST /api/auth`
calls `payload.login()` and sets Payload's cookie. Same user table, same
cookie, same roles as `/admin`. Bad credentials return 401 with a message that
does not reveal whether the address exists.

**HNN links out and stays intact.** `/hnn` 307s to the HNN app from the brand
record. No proxy, no shared secret, no second session to keep in step. `~/HNN`
is unmodified at `d9d3afa`.

**Three content types added** — Media (uploads, which did not exist at all),
Articles, Magazine Issues, Appearances — and the admin regrouped to
Library / Stories / The Worlds / Who & What / Settings, with `Entries`
relabelled `Collections` and `Locations` relabelled `Places`. Labels changed,
slugs did not, so every table, migration, relation and API path is untouched.

### Bugs this work surfaced

- **`/hnn` redirected to itself.** A relative `externalHref` of `/hnn` on the
  brand whose slug is `hnn` is a 307 loop. `externalDestination()` now requires
  an absolute URL.
- **The nav emitted dead links.** Components defaulted to `brand = "fampire"`,
  a route that no longer exists, so every nav item on a real brand page 404'd.
  The prop is required now, and the compiler found all four omissions.
- **Intent lanes were double-quoted.** `"/${brand}/library?kind=..."` is
  literal text, not interpolation. Caught by an unused-variable warning that
  would have been easy to dismiss.

### Collection detail pages

`/[brand]/collections/[slug]` — every collection now has an address of its own.
All 559 carry a human-readable, unique slug (`event-photography-andrew-tate-cover-shoot`,
not a Drive folder id), because a press contact pastes these into email.

The §8 unfurl criterion is met and verified: `og:title`, `og:description`,
`og:image` (1200px, `summary_large_image`), canonical and Twitter tags all
render server-side, which is the whole reason a crawler can read them.

**The preview image is a frame we proved renders**, recorded by the orientation
sampler rather than guessed. Picking the first candidate file instead would be
right about 90% of the time, and the other 10% is a link preview with a broken
image — worse than no image. 453 of 559 have one; the remaining 106 fall back
to `twitter:card: summary` and unfurl with title and description only, never a
broken thumbnail.

The page does NOT browse the folder. §4.5 rule 5 — stop at the collection and
let Drive handle the leaf. The outbound link is the primary action; Drive
already does browse, preview and in-folder search better than we would, and
rebuilding that is how a catalog becomes the DAM the client rejected. Library
cards route through this page, so it is still two clicks to the material and
rule 1 holds.

Access control is Payload's, not ours: a draft or held-back collection 404s
rather than 403s, so the page never confirms that a private entry exists.
Verified — draft 404, right slug under the wrong brand 404, unknown slug 404.

### Link health monitor

`scripts/check-links.ts` — 559 links in 40s at concurrency 12. **100% healthy**,
above §8's 98% bar, and now a standing invariant in `verify-catalog.ts` rather
than a one-off observation.

§5.2's hard requirement is that "a Drive folder that returns 200 but redirects
to sign-in is NOT healthy". Checking the canonical folder URL cannot detect
that — measured, a folder we know is public returns 200 with "Sign in" in its
HTML, because Drive's UI always ships that button. Matching on sign-in text
would mark every healthy folder broken. The monitor probes
`embeddedfolderview` instead, where a public folder renders 56 content rows and
a dead id returns 404 with zero. Presence of rows is the signal.

Proven to fail, not just to pass: a fixture pointing at an impossible folder id
was correctly recorded as `gone — folder not found` and reported below
threshold. A monitor that says "ok" to everything manufactures confidence.

Passworded entries count as healthy — that is a documented access mode (§3.1),
not a fault. Nightly scheduling is a cron line in the file; the client runs it
on their own host (§9.2).

### Orientation is now a real filter

It was in the database and the API for a while before it was in the Library UI,
which meant `?orientation=portrait` was silently ignored on the site while
appearing to work through the API. Now a UI axis alongside a new `occasion`
axis, labelled "Vertical"/"Horizontal" because that is what an editor cutting
for social actually says — and searchable by those words too. Measured:
236 b-roll → 66 vertical, 134 horizontal.

### Still open

- `resolutionClass` (§7.7) — unsolved, and not solvable by sampling.
- Lexical rich text renders as plain text; the official serialiser is not wired.
- No theming per brand; `SiteSettings` models nav and footer but the shell does
  not read it yet.
- 31 publishable entries cannot be orientation-sampled (RAW/MXF/TIFF folders).
