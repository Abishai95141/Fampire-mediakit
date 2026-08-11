# FAMPIRE Media Center

FAMPIRE is **appended to** the HNN app, not merged into it. It lives in its own
route group, has its own typeface, palette, chrome and access model, and shares
exactly one thing with the portal: the session cookie.

---

## 1. What was built in this pass

| Surface | Route | Access |
|---|---|---|
| Front door — hero, video, search, four intent lanes, narrative sections | `/fampire` | public |
| The Library — faceted pool, every filter state URL-addressable | `/fampire/library` | public |
| The Films — synopses, awards, where to watch | `/fampire/films` | public |
| The People — bios and the approved spoken introduction | `/fampire/people` | public |
| Press — 57 dated appearances with hosts and audience figures | `/fampire/press` | public |
| Sign in — FAMPIRE's own login experience | `/fampire/login` | public |

**HNN is untouched.** Its routes, layout, components, CMS, schema and login all
behave exactly as before. One file changed: `proxy.ts`, which gained a
`PUBLIC_PREFIXES` allowlist so `/fampire/*` is not bounced to `/login`. No HNN
path, API or binary prefix is affected.

---

## 2. The catalog

Everything on these pages comes from two real sources, captured live and
committed under `data/fampire/sources/`:

- the client's **B-Roll Asset Library** Google Doc — 261 named links
- **biohackyourself.com/media-kit-press-materials** — links, synopses, award
  lists, magazine issues, the appearance log and the approved bios

Two generators turn those into the data the app reads. Both are idempotent, and
both fail loudly rather than shipping a half-built file:

```bash
node scripts/fampire/build-catalog.mjs      # -> data/fampire/catalog.json
node scripts/fampire/build-appearances.mjs  # -> data/fampire/appearances.json
```

Two more generators complete the set:

```bash
node scripts/fampire/build-previews.mjs   # -> data/fampire/previews.json
node scripts/fampire/check-links.mjs      # -> data/fampire/link-health.json
```

They are deliberately separate files that `build-catalog.mjs` merges, so
re-running one never clobbers another's work. Order for a full refresh:
previews → links → catalog.

Current output: **94 collections** (83 public, 11 held back), **57 press
appearances**, and **81 of 94 collections carrying a real preview image**.

### What the catalog generator actually does

- **Renames for strangers.** The curated table in `build-catalog.mjs` is the
  human layer — `CARD 1` and `Dump 1` never reach a reader. Everything else
  (platform, access, year, minor-flag draft) is derived, so it stays consistent
  as the table grows.
- **Repairs account-scoped Drive links.** `drive.google.com/drive/u/1/folders/…`
  opens "the second Google account in this browser", which for anyone but the
  client is an error page. Those are rewritten to the portable
  `/drive/folders/<id>` form, with the original kept in `rewritten_from`.
- **Catches dead links at build time.** Two entries resolve to Dropbox `/home/`
  paths that only the account owner can open — exactly the failure mode the
  build plan flagged. They are marked `access: "broken"` and render as an
  un-clickable card labelled *Owner-only path*, never as a live link.
- **Refuses to caption a photograph it cannot identify.** Ten of the client's
  pages share one site-wide `og:image`. Any image appearing on more than two
  pages is dropped rather than used as if it were a portrait of a specific
  person.

---

## 3. Access model

Public by default, which is the point of a press room:

- **83 collections** open with no account, no form, no email capture.
- **11 are held back**, and are not merely hidden behind a click — they are
  filtered out of the server response entirely. A signed-out request for
  `/fampire/library` contains none of their titles and none of their URLs.
  Verified.

Held back for two distinct reasons, and they should not be confused:

1. **Gated at source** — Vimeo password-protected documentary parts, and the
   two dead Dropbox owner paths.
2. **Awaiting written sign-off** — collections featuring Love or Legend Lolli.

On (2): `contains_minor` is **drafted, never decided**. Fifteen entries carry a
draft flag and `contains_minor_confirmed: false`. Per the build plan's hard
stop, a named person confirms each one in writing before it publishes. Signing
in does not lift this, and the login page says so.

The bios and headshots the family already publishes on their own media kit stay
public, matching their own publishing decision. The raw BTS and treatment
folders do not.

---

## 4. Authentication

One identity, two front doors.

`/fampire/login` posts to the same `/api/auth` as the HNN portal and receives
the same HMAC-signed session cookie. So:

- someone already signed in to HNN arrives at FAMPIRE already authenticated
- signing in at FAMPIRE carries into the HNN portal
- neither login borrows the other's design

The FAMPIRE form defaults its post-login destination to `/fampire`, not `/` —
otherwise signing in there would drop you into the portal.

---

## 5. Link health

The monitor is a **required feature**, not tooling: the whole platform is a
catalog of pointers at somebody else's storage, so link rot is the
architecture's single biggest risk. An entry that looks perfect and opens a 404
is worse than no entry, because a journalist on deadline has already spent
their trust on it.

```bash
node scripts/fampire/check-links.mjs      # exits non-zero below 98% healthy
```

The hard part is that almost nothing here fails with an honest status code, so
every platform gets its own probe and **200 OK is never on its own treated as
healthy**:

| Platform | Why the naive check lies | What we do instead |
|---|---|---|
| Drive folder | `/drive/folders/` is a client-side app; returns 200 whether or not you can see it | `embeddedfolderview`, which 404s properly and carries `flip-entries` when public |
| Drive file | a file you cannot open still returns 200 | look for the "Request access" interstitial and the accounts.google.com redirect |
| Dropbox | a deleted share returns 200 with an error page | match the error copy; `/home/` paths are owner-only by construction |
| Pic-Time | a pass-protected gallery returns 200 with a form | detect the password form; treat `/client` and `/portfolio` as gated |
| Vimeo | a password-gated video returns 200 on the page | oEmbed, which returns 403 for private and 404 for gone |

A 200 from Drive with no listing and no sign-in prompt is recorded as
`timeout`, not `gone` — that shape is rate-limiting, and calling it dead would
flag healthy entries at random. Storefronts that refuse automated requests
outright (Google Play, Amazon) get their own `blocked` status and are excluded
from the health ratio rather than counted as rot.

**Current sweep — 176 links, 96.0% healthy.** Below the 98% target, so the
script exits non-zero; wire it to a nightly job and it will tell somebody.

| | |
|---|---|
| `gone` | **Andrew Tate Production — Dubai** (`1pNQJkfRe0H6…`) and **Lara Trump — Magazine Cover Photoshoot** (`1DKFlMxDHLdO…`). Both folder IDs 404 in the client's own index. Verified against the original account-scoped form too — these were dead before we touched them, not broken by the URL rewrite. |
| `login-required` | the two sHEALed Dropbox `/home/` paths, plus **Bryan Johnson — In-Home Biohacking Production**, whose Drive folder now asks for sign-in |
| `password` | the Pic-Time portfolio root — expected, it is gated by design |
| `blocked` | From Fat Lolli on Google Play — 403 to any non-browser request; works fine in a browser |

A measured status **overrides** what the catalog assumed from the URL shape,
and anything a stranger cannot open drops out of the public pool rather than
sitting there presenting itself as a working link. That is why the public count
moved from 83 to 80. Signed-in users still see them, flagged *Link is dead at
source* or *Sign-in required at source*, because the internal team is who needs
to fix them.

There is a working sibling folder for Andrew Tate
(`1syX1dwMDEFdfVrfkTOteIfovtNzYkHT0`, the magazine cover shoot) — but it is not
obviously the same Dubai production coverage, so it has **not** been swapped in
silently. That is a client call.

---

## 6. Search

In-process substring matching over an index built once at module load — no
scoring, no fuzzy library, nothing to tune. 94 rows of text, and **1000
searches run in 20ms**, so the 300ms target is not close to being a constraint.

Multiple terms narrow rather than widen (`tereza` → 34, `tereza 2025` → 12),
which is what someone typing two words means. Facets compose with the query,
and every state round-trips through the URL.

The one thing that needed real work was vocabulary. The catalog speaks
production language — `b-roll`, `event photography`, `BTS` — and a journalist
types press language. Measured against a battery of 58 realistic queries,
**twelve returned nothing**, and almost all were vocabulary mismatches rather
than genuinely absent material: `photos` found 1 where `photo` found 32,
`clips` / `broll` / `trailers` / `bios` / `kids` found nothing at all.

Three cheap fixes, all folded into the index so matching stays a substring
test:

- **Punctuation is normalised away**, so `b-roll` and `broll`, `Bye Ol'
  Dentistry` and `bye ol dentistry` are the same tokens.
- **Singular and plural are one word** — the term is tested with and without a
  trailing "s". Not a stemmer; a stemmer would also conflate things a reader
  meant to keep apart.
- **Alias vocabulary per kind and per subject**: `b-roll` also indexes "clips
  footage video cutaway", `event photography` also indexes "photos stills
  pics gallery", and the children also index "kids children family", because
  they are searched for by relationship far more than by name.

All 58 queries now return results. The four that still legitimately return
nothing are `vertical`, `print`, `300 dpi` and orientation terms generally —
those fields are not populated yet (§9), and inventing matches for them would
be worse than an honest empty state.

---

## 7. Previews

Every card carries a picture, and none of them is hosted here.
`scripts/fampire/build-previews.mjs` asks each platform for the thumbnail it
already publishes:

| Source | How | Count |
|---|---|---|
| Drive folder | crawl `embeddedfolderview` (the only server-rendered view of a Drive folder), descend to real files, then `drive.google.com/thumbnail?id=…` | 56 |
| YouTube | `i.ytimg.com`, maxres where it exists | 48 press rows |
| Their own pages | page `og:image` | 14 |
| Vimeo | oEmbed, size suffix rewritten up from the 295px default | 1 |
| Drive file / Dropbox file | direct thumbnail / `raw=1` | 3 |

Three details that matter:

- **The first file in a folder is usually not a picture of anything.** `Lower
  Third` opens on a chroma-key plate, `Logos` on a transparent PNG. Candidates
  are scored by the byte size of a 400px render — compression is a good enough
  detail detector — and anything under 9KB is treated as a flat fill. Folders
  where *everything* is flat are marked `image_flat` and rendered contained on
  the paper ground rather than cover-cropped, so a green plate reads as an
  asset preview rather than a design error.
- **Dropbox shared folders publish nothing a server can read** — zero filenames
  in the HTML, exactly as the build plan recorded. Nineteen collections have no
  possible preview. Where such a collection belongs to a film, it borrows that
  film's key art (recorded as `borrowed-film-art`); key art reads unmistakably
  as key art, so nobody mistakes it for a photograph of the folder. The
  remaining thirteen render a typographic plate naming the material and the
  platform.
- **Love and Legend share a bio folder**, so asking for each one's best picture
  independently returned the same frame twice. `previewsForSubjects()` resolves
  a row of people together and walks each subject's contact strip until it
  finds a frame nobody else has taken.

One non-obvious bug worth remembering: `drive.google.com/thumbnail` answers
**429 to any request carrying a `Referer` it doesn't recognise**. The images
load fine from a terminal and fail silently in the browser. The fix is
`referrerPolicy="no-referrer"` on the `<img>`, nothing more.

---

## 8. Design

| | HNN portal | FAMPIRE |
|---|---|---|
| Ground | off-white / deep green | white |
| Type | Inter Tight throughout | Plus Jakarta Sans primary + Poppins secondary |
| Chrome | sidebar rail, 116 pages | masthead, press-room |
| Colour | full brand colour system | none — black, white, one warm neutral |
| Preloader | logotype fades in, bar fills, plane lifts | crop-mark frame draws, glyphs rise under a mask, plane splits and parts sideways |

Two faces, no third. **Plus Jakarta Sans** is primary and carries every
heading, paragraph and number; **Poppins** is secondary and is confined to the
small letter-spaced furniture — eyebrows, labels, buttons, running metadata —
where its wider shapes read as a different voice at 11–13px without competing
at display sizes. Both load in the FAMPIRE layout, not the root layout, so the
HNN portal downloads neither. Poppins is bound to `--font-poppins-fam` rather
than `--font-poppins`, because the root layout already defines the latter at a
single weight for HNN's typography-specimen pages.

**There is no grey surface.** Bands are black or white and nothing in between;
rhythm comes from inversion rather than tint. Media wells sit on black, which
is also what makes a transparent logo PNG visible instead of dissolving into
the page.

Tokens are `--fam-*` in `app/globals.css`; utilities are scoped under `.fam`,
which only the FAMPIRE layout sets. Nothing in either block can reach an HNN
surface.

**Hierarchy.** Text uses a three-step ramp (`--fam-body` #26251f,
`--fam-muted` #57544e, `--fam-faint` #8b877f) rather than opacity percentages.
Percentages are how a page ends up uniformly pale — every level reads as
slightly greyer than the last and nothing leads. Sections open on a 2px black
rule with a number (`components/fampire/Section.tsx`), so the eye can find
where each one begins without reading a word, and the institution band is
inverted to give the page a spine.

**Motion.** Lenis smooth scrolling, reusing the portal's existing
`components/SmoothScroll.tsx` rather than a second copy — root mode, no wrapper
divs, opts itself out under `prefers-reduced-motion`. The intent lanes animate
in on first view (`components/fampire/Lanes.tsx`): the rule draws ahead of the
type, one row after another, so the section reads as four *choices* being set
rather than a block appearing.

**Descenders.** Plus Jakarta Sans has deep descenders, and display type set at
`leading-none` shears the tail off every y, g, p and j — "The Library" lost the
leg of its y. `.fam-display` now carries a 1.06 line-height floor, the
mask used by the rise animation pads and negative-margins the extra room back,
and every sub-1.06 `leading-*` utility on display type has been raised rather
than left to fight it.

**One cascade trap worth knowing.** Tailwind v4 emits its utilities inside
`@layer utilities`, and in the CSS cascade an *unlayered* rule beats a layered
one regardless of specificity. A plain `.fam .fam-display { color: … }` in
globals.css therefore defeats `text-white` on the same element — which rendered
the masthead and the hero statistics near-black against the black video. The
fix is not specificity, it is layering: FAMPIRE's colour defaults live in
`@layer base`, so any utility can override them. That is what lets the same
components invert over the hero footage.

---

## 9. The hero video

The hero is a **split**: the film panel is 16:9 — the film's own shape, so the
whole frame shows with nothing cropped off the sides — and takes all the width
left by a deliberately narrow (18.5rem) information column beside it on white.
Nothing is ever laid over the video. Type laid
over moving footage is unreadable at any scrim strength, because the picture
underneath keeps changing; the masthead is white and opaque for the same
reason. The information column runs vertically: who this is, one paragraph,
the three counts one per row, then the two routes in. On a phone the video
stacks above that column rather than shrinking beside it.

It plays the client's own Vimeo master rather than an MP4 copied into
`public/`, so the catalog premise stays honest on the most visible surface on
the site. Configuration is five lines in `lib/fampire/media.ts`.

**It is playing before anyone sees it.** The iframe mounts on the first render
— while the preloader is still covering the screen — and the preloader waits
for a `fampire:hero-ready` event before it parts. That is the only way to avoid
the black rectangle a lazily-mounted background video always shows for its
first second. There is no loading slate.

Two concerns are kept strictly separate, and conflating them was a real bug:

- **Releasing the preloader** happens on a deadline no matter what (3.4s), so a
  stalled player can never trap a visitor behind the curtain.
- **Revealing the iframe** happens only on evidence of real playback — a
  `play` or a `timeupdate` past the start point over Vimeo's `postMessage` API.
  The iframe's `load` event is not used: it fires just as happily for an error
  page, and fading in on the deadline once put Vimeo's *"we couldn't verify the
  security of your connection"* interstitial full-screen across the hero.

**The skeleton.** Underneath the player sits the family portrait — all four
Lollis, landscape, no burned-in titling — shown sharp so the panel is never
black for a frame. This matters most on a **return visit**, where the preloader
is suppressed (it plays once per tab session) and nothing else covers the panel
while the player reconnects.

It is not the video's auto-thumbnail: Vimeo hands back one fixed frame and for
this trailer it lands mid-title-card with burned-in type cut off mid-word. It is
a specific frame out of Anthony's "Bio & Headshots" folder — the one the client
publishes on their own media-kit page for press to use freely — rather than a
folder-level preview, because the folder's cover frame is not the picture we
want.

**For the sign-off list:** this photograph includes Love and Legend. It is
already published by the family themselves in a press folder offered for
unrestricted use, which is why it is used, but it belongs on the list a named
person confirms before launch (build plan §9). `HERO.skeletonFileId` in
`lib/fampire/media.ts` is a one-line change.

**Sound, and why the curtain has a click in it.**

There is **one media element in the hero: a single `<iframe>` pointing at the
client's Vimeo master.** The audio is that video's own track — no separate
audio element, no second source, nothing layered.

There is no sound control either. The thing that cannot be engineered around is
that **browsers refuse audible autoplay until the visitor has interacted with
the page**, and a click dispatched from script does not count — script events
carry `isTrusted: false` and deliberately do not create user activation.

So the preloader **is** that interaction. The whole curtain is one
full-viewport `<button>` labelled *Enter the FAMPIRE Media Center*, with a
*click anywhere to enter* prompt fading in at 1.3s. It is a real button rather
than a div with a handler because Enter and Space must work too — a keypress
carries activation exactly as a click does, and a keyboard visitor should not
be the one person who gets a silent hero.

**Activation is sticky for the life of the document**, and the whole design
follows from that one fact:

| | curtain | sound |
|---|---|---|
| first load | plays | audible from the moment it parts |
| Films → People → Press → back home | does **not** replay | still audible — same document, activation held, the remounted player just re-acquires it |
| hard reload / new tab | **plays again** | audible again |
| deep link to `/library` etc. | never shown | n/a |

That table is why the flag is module scope rather than `sessionStorage`.
sessionStorage persisted across reloads, so the curtain was suppressed exactly
when it was needed and the hero came back silent — which was the reported bug.
Module state resets with the document, which is precisely the lifetime of the
activation it is standing in for.

On a remount the player starts muted all over again, so `HeroVideo` keeps
asking — on `ready`, on first confirmed playback, on any gesture, and on a
700ms poll — until `volumechange` confirms it has audio. The poll runs longer
once sound has already worked in this document, because by then it is a
question of timing rather than permission.

Verified end to end: first load → entry → traverse four pages → back home
(curtain does not replay, hero remounts with the right video) → hard reload
(curtain returns) → deep link (never shown).

`background=1` is deliberately NOT used on the embed: that mode force-mutes and
ignores volume calls entirely.

**The loop is layered, because the two mechanisms fail in opposite
directions.** `loop=1` stays in the embed URL as the unconditional fallback: if
the player API never connects, the native loop still keeps the hero moving
forever. It is the worse loop — it rewinds to zero, replaying the burned-in
title card — but it cannot fail silently.

Once we *are* talking to the player we turn it off and take over, because the
native loop suppresses the `ended` event and leaves no hook to correct it. The
`timeupdate` handler seeks back to `startAt` when it is within 0.75s of the
end, so the player never reaches its final frame at all — reaching it is the
visible "the video stopped". `ended` remains as a backstop, `pause` and
`visibilitychange` restart a player that stalled or was backgrounded, and a
2s watchdog calls `play()` if `timeupdate` has been silent for three seconds.

`startAt: 48` skips the trailer's opening title card, and the hand-rolled loop
returns there rather than to zero.

**Not verified locally:** headless Chromium ships without the proprietary
codecs Vimeo's HLS stream needs, so playback could not be confirmed in the
capture environment — only the idle and still states were. Worth thirty seconds
in a real browser.

---

## 10. Still to build

Against the build plan, this pass covered stages 1 and 2 (lock the catalog,
prove retrieval) plus the front door and three of the six narrative sections.
Outstanding:

- **Scheduling the link monitor.** The checker is built and its results are
  merged into the catalog (§5); what is missing is the nightly job that runs it
  and the dashboard that shows the internal team the current failures. Today it
  is a command someone has to remember to type.
- **Payload CMS + brand tenancy.** The catalog is a generated JSON file, not a
  database. Fine at 90 entries and genuinely fast; it does not give the client's
  media team a way to add an entry themselves, which is an acceptance criterion.
- **The remaining narrative sections** — The Institution, The Magazine and The
  Room exist as bands on the front door but not as their own pages.
- **Per-entry detail pages**, and therefore per-entry link unfurls.
- **Orientation sampling** — `orientation` and `resolution_class` are not yet
  populated, so an editor cannot filter for vertical b-roll.

---

## 11. Open questions for the client

1. **Who signs off the 15 minor-flag drafts, and in what form?** Nothing
   featuring Love or Legend publishes until this is answered.
2. **The two dead Dropbox links** — `sHEALed` San Diego and Atlanta. They need
   re-sharing as `/scl/` links; `/home/` paths cannot be made to work.
3. **Hero choice.** The directors trailer is a strong bed but it is a Biohack
   Yourself asset standing in for the whole institution. A FAMPIRE-level cut
   would be better if one exists.
4. **The thirteen collections with no possible preview** are all Dropbox shared
   folders. Re-sharing them from Drive, or supplying one representative still
   each, is the only way they get a picture.
