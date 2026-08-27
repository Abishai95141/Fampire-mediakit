/**
 * The compact mark, shown in the admin's collapsed nav next to the menu.
 *
 * Just the F — at that size the full wordmark is unreadable, and the public
 * masthead has no separate mark to borrow.
 */
export const Icon = () => (
  <span
    style={{
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      fontSize: "1.35rem",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1,
    }}
  >
    F
  </span>
);

export default Icon;
