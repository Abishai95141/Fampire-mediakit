import config from "@payload-config";
import { getPayload } from "payload";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const r = await api.find({ collection: "people", where: { "aliases.alias": { exists: true } }, limit: 100, depth: 0, overrideAccess: true });
for (const d of r.docs as { name: string; aliases?: { alias: string }[] }[]) {
  console.log(`  ${d.name}  <-  ${(d.aliases ?? []).map((a) => a.alias).join(", ")}`);
}
console.log(`\n${r.totalDocs} people carry aliases`);
process.exit(0);
