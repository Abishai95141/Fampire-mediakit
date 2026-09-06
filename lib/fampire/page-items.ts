/**
 * Resolve a page-owned row against its optional source record.
 *
 * The landing page holds its own cards. Each row may point at a record, and
 * that pointer is a CONVENIENCE, not a dependency:
 *
 *   - a field typed on the page always wins,
 *   - a field left blank falls back to the record,
 *   - the record is never written to.
 *
 * So an editor can add a card that exists nowhere else, or take an existing
 * person and give them a different portrait and a different caption on this
 * page alone, and the Person record is untouched either way. That is the
 * whole point of the exercise: the landing page is content, not a view.
 */

/** A Payload relationship value: an id, a populated doc, or nothing. */
export type Ref = number | string | { id?: number | string; [k: string]: unknown } | null | undefined;

export const refId = (r: Ref): number | string | null => {
  if (r == null) return null;
  if (typeof r === "object") return (r.id as number | string) ?? null;
  return r;
};

/** The populated doc, when Payload resolved one. */
export const refDoc = <T = Record<string, unknown>>(r: Ref): T | null =>
  r && typeof r === "object" ? (r as unknown as T) : null;

/** First non-blank value. Blank means null, undefined or an all-space string. */
export function pick<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    return v;
  }
  return null;
}

/**
 * A picture chosen from the page row first, then the record.
 *
 * Order within the row matters: an uploaded image beats a pasted URL, because
 * picking a file is the more deliberate act of the two and the field that is
 * harder to fill by accident.
 */
export function picture(
  image: Ref,
  imageUrl?: string | null,
  ...fallbacks: (string | null | undefined)[]
): string | null {
  const up = refDoc<{ url?: string }>(image);
  return pick<string>(up?.url, imageUrl, ...fallbacks);
}
