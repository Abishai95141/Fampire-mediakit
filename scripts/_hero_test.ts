import config from "@payload-config";
import { getPayload } from "payload";
const payload = await getPayload({ config });
const r = await payload.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, overrideAccess: true, draft: true });
const page = r.docs[0]!;
const layout = (page.layout ?? []) as Record<string, unknown>[];
const i = layout.findIndex(b => b.blockType === "heroFeature");
// The client's own film on YouTube — proves the path end to end.
layout[i] = { ...layout[i], videoId: "https://www.youtube.com/watch?v=AGZDzg-9OBI" };
await payload.update({ collection: "pages", id: page.id, data: { layout }, draft: false, overrideAccess: true });
console.log("hero set to the YouTube film link");
