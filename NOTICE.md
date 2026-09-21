# Third-party notices

What this repository carries that somebody else wrote, and what each licence
asks of us. `LICENSE` covers the rest.

## Source vendored into this repository

### React Bits — `components/reactbits/ScrollExpand.{tsx,css}`

Copyright (c) 2026 David Haz — <https://github.com/DavidHDev/react-bits>
**MIT, with the Commons Clause.**

The one piece of third-party *source* committed here. The MIT grant covers use
in an application, including commercially; the Commons Clause adds one
restriction: *"You may not sell, sublicense, or redistribute the components
themselves—whether alone, in a bundle, or as a ported version."*

- **Fine:** shipping it inside this site, modifying it, deploying it for the
  client. Two modifications are made and both are documented in the file.
- **Not fine:** lifting these two files out and publishing or selling them as a
  component.

MIT also requires the copyright notice to travel with the code, so it is at the
top of both files. Leave it there.

## Design provenance

The landing page's visual system — the `.zeen` layer in
`app/(frontend)/globals.css` — was written here, not copied. Its type scale,
palette and section rhythm were measured off a layout the client selected and
approved ("Brand Accelerator"); the CSS implementing them is this project's
own. No template file, stylesheet, script or image is redistributed.

**This is a procurement question, not a code one.** If that layout came from a
paid template, the licence for it is held by whoever bought it, and this
repository does not evidence one either way. Worth confirming before launch.

## Fonts

Geist, Plus Jakarta Sans, Poppins and Caveat, loaded through `next/font/google`
in `app/(frontend)/layout.tsx`. All four are under the **SIL Open Font License
1.1**, which permits embedding and web use. Next downloads and self-hosts them
at build time, so no font file is committed and no request goes to Google at
runtime.

## Dependencies

744 packages install from npm. The tally, taken from the installed tree:

| Licence | Packages |
|---|---|
| MIT | 618 |
| Apache-2.0 | 56 |
| ISC | 33 |
| BSD-3-Clause / BSD-2-Clause / 0BSD | 23 |
| MPL-2.0 | 4 |
| LGPL-3.0-or-later | 2 |
| Other permissive (BlueOak, CC0, CC-BY-4.0, WTFPL, Python-2.0) | 6 |

**No GPL, AGPL, SSPL or other network-copyleft anywhere in the tree.** Nothing
obliges this source to be published.

The two LGPL entries are `@img/sharp-libvips-*` — the libvips binaries that
`sharp` links for image resizing. LGPL permits this: the library is used
unmodified through its published interface, and the binary is not altered.
Payload, Next.js and React are all MIT.

Re-check after any dependency change:

```bash
npm ls --all --json > /dev/null && npx license-checker --summary
```

## The client's own material

Everything under `data/fampire/` and `public/landing/` describes or reproduces
The Lolli Family Institution's archive, supplied by them for this build. It is
theirs, and none of the licences above apply to it.

One rule about that material is enforced in code and must stay enforced:
collections featuring the children are held back from publishing until a named
human confirms each one. `scripts/verify-catalog.ts` fails if that ever stops
being true.

## Passwords

`data/fampire/sources/broll-asset-library.txt` is a captured copy of the
client's own link index. The Vimeo passwords it contained have been redacted
from the committed copy; the catalog marks those entries `access: password` and
links to the page that prompts for them. Do not restore them here.
