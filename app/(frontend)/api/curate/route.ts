import config from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";

import { currentUser } from "@/lib/fampire/auth";

/**
 * Curate the landing page from the landing page.
 *
 * Every section that draws from a collection shows EVERYTHING in it by
 * default — all the brands, the whole family, the whole slate. Taking one
 * item off the page previously meant opening the CMS, finding the block, and
 * then listing every item you DID want, because an empty relationship means
 * "all". Removing one thing by naming the other seven is backwards, and it is
 * why nobody curated anything.
 *
 * So each block carries a `hidden` list instead, and this is the endpoint
 * that writes to it. Hiding is SUBTRACTION FROM A PAGE, never a delete: the
 * person, brand or film keeps existing, keeps its collections, and still
 * appears on /people, /films and in the Library. Undo is removing it from the
 * same list.
 *
 * The whole read-modify-write happens here rather than in the browser. The
 * alternative — fetch the page, edit the layout client-side, PATCH it back —
 * would put the entire page document through a browser that only wanted to
 * drop one id, and would overwrite any concurrent edit with whatever that tab
 * happened to be holding.
 */

type Body = {
  pageId: number | string;
  /** Index into the page's `layout`, so two blocks of the same type stay distinct. */
  blockIndex: number;
  /** Row id to hide or restore. */
  value: number | string;
  action: "hide" | "show";
};

export async function POST(req: Request) {
  // Fails closed. This mutates a published page, so an unresolved session is
  // a refusal, not a fallback.
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { pageId, blockIndex, value, action } = body ?? {};
  if (pageId == null || typeof blockIndex !== "number" || value == null) {
    return NextResponse.json({ error: "pageId, blockIndex and value are required" }, { status: 400 });
  }

  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = payload as any;

  const page = await api.findByID({
    collection: "pages",
    id: pageId,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  if (!page) return NextResponse.json({ error: "page not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout = [...((page.layout ?? []) as any[])];
  const block = layout[blockIndex];
  if (!block) return NextResponse.json({ error: "block not found" }, { status: 404 });

  const asId = (v: unknown) => (v && typeof v === "object" ? (v as { id: unknown }).id : v);
  const current = (Array.isArray(block.hidden) ? block.hidden : []).map(asId);
  const next =
    action === "show"
      ? current.filter((v: unknown) => String(v) !== String(value))
      : [...new Set([...current, value].map(String))].map((s) =>
          // Relationship ids are numeric in Postgres; a string id would be
          // stored and then never match on read.
          Number.isNaN(Number(s)) ? s : Number(s),
        );

  layout[blockIndex] = { ...block, hidden: next };

  await api.update({
    collection: "pages",
    id: pageId,
    data: { layout },
    depth: 0,
    overrideAccess: true,
    user,
  });

  /**
   * Republish, because `update` on a drafts-enabled collection writes a
   * DRAFT. Without this the change would be invisible on the very page the
   * editor is looking at, which reads as "the button did nothing".
   */
  if (page._status === "published") {
    await api.update({
      collection: "pages",
      id: pageId,
      data: { _status: "published" },
      depth: 0,
      overrideAccess: true,
      user,
    });
  }

  return NextResponse.json({ ok: true, hidden: next });
}
