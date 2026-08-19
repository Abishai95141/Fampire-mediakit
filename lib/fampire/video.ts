/**
 * Which video service a hero URL points at, and its id.
 *
 * Deliberately in `lib/`, not in HeroVideo.tsx. It lived there first and that
 * broke the landing page with a 500: HeroVideo carries `"use client"`, so
 * exporting a plain function from it makes that function a client export, and
 * RenderBlocks — a server component — cannot call it. Next's error is explicit
 * about this ("Attempted to call parseVideo() from the server but parseVideo is
 * on the client"), but nothing catches it at build time, because the import is
 * perfectly valid TypeScript.
 *
 * Shared logic that both sides need belongs in a module that declares neither
 * boundary.
 *
 * The hero could only ever be a Vimeo id, which became a hard block once the
 * client's trailer had embedding disabled: the player answers 401 to every
 * site and no code can override that. YouTube embeds freely.
 */
export type HeroVideoSource = { kind: "vimeo" | "youtube"; id: string };

export function parseVideo(input?: string | null): HeroVideoSource | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  // A bare number is a Vimeo id, which is what this field held originally.
  if (/^\d+$/.test(v)) return { kind: "vimeo", id: v };
  const yt = v.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { kind: "youtube", id: yt[1]! };
  const vm = v.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: "vimeo", id: vm[1]! };
  return null;
}
