/**
 * The FAMPIRE wordmark, for the admin login screen and nav.
 *
 * Drawn in type rather than shipped as an SVG because the public site's own
 * masthead is type too (components/fampire/Shell.tsx) — there is no logo file
 * anywhere in the repo, and inventing one here would put a second, drifting
 * version of the brand in the product.
 *
 * Registered in payload.config.ts under `admin.components.graphics`. Anything
 * referenced there must also exist in app/(payload)/admin/importMap.js, which
 * is generated at BUILD time by `npm run payload:importmap`. A component the
 * map does not know about renders the entire admin as a blank page, with the
 * only clue in the server log — see the note above `plugins` in the config.
 */
export const Logo = () => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: "0.6rem",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    }}
  >
    <span
      style={{
        fontSize: "1.9rem",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      FAMPIRE
    </span>
    <span
      style={{
        fontSize: "0.62rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        opacity: 0.55,
      }}
    >
      Media Center
    </span>
  </div>
);

export default Logo;
