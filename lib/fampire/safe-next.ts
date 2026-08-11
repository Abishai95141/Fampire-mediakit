/**
 * Sanitize a ?next= return path. Only same-origin absolute paths survive —
 * anything else ("//evil.com", "/\evil.com", "https://…", empty) falls back
 * to the Media Center home.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/fampire";
  if (!raw.startsWith("/")) return "/fampire";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/fampire";
  return raw;
}
