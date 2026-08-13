# Running FAMPIRE and HNN

**They are two separate applications.** Separate repositories, separate
databases, separate CMSs, separate logins. Nothing is shared at runtime — no
proxy, no shared session, no shared secret. That is deliberate: the brief's
first non-negotiable is that HNN stays intact, and the surest way to keep it
intact is to not touch it.

| | FAMPIRE Media Center | HNN |
|---|---|---|
| Repo | `~/fampire-media-center` | `~/HNN` |
| CMS | Payload, at `/admin` | its own studio, on Drizzle |
| Database | Postgres `fampire_media_center` | its own |
| Auth | Payload users | its own, unrelated |
| Port (dev) | 3200 | 3000 |

HNN is **not** a brand record in this CMS, and there is no HNN surface in this
app at all. It was modelled as one briefly, which produced a card on the front
door that looked like part of this site and then redirected somewhere else —
the single most confusing thing in the build.

## One site, one brand, one library

FAMPIRE is the whole site, not a section of it. There are no brand URL
segments: `/library` holds every collection, and the brands
(Biohack Yourself, Lolli Brands Entertainment, Lolli Holdings, and the four
with no material yet) are a **filter** on that one library, alongside kind,
orientation, occasion, person, film, event and year.

```
/                      the FAMPIRE press room
/library               all 476 published collections · brand is a facet
/films /people /press
/collections/<slug>    one collection, shareable, unfurls
/<anything>            CMS-authored pages
/admin                 the CMS
```

Brands remain tenants **inside the CMS** — that is how a contributor is scoped
to their brand's content and how a ninth brand is added without a deploy. A
reader never sees one in a URL.

## Running them

Each on its own:

```bash
npm run dev          # FAMPIRE on http://localhost:3200
npm run dev:hnn      # HNN, from ~/HNN
```

Both at once, which is what you want when demonstrating the institution:

```bash
npm run dev:all
```

`dev:all` runs the two dev servers side by side with prefixed output. It does
not couple them: either can be stopped without affecting the other, and
FAMPIRE works perfectly well with HNN not running at all.

Point it at a different checkout with `HNN_DIR`:

```bash
HNN_DIR=/path/to/HNN npm run dev:all
```

## Why 3200

3000 is HNN's own default and 3001 was occupied on the build machine. FAMPIRE
takes 3200 so the two never collide when both are up.
