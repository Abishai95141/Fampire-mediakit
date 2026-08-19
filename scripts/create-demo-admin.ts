import config from "@payload-config";
import { getPayload } from "payload";

/**
 * A throwaway local admin login for the CMS walkthrough recording.
 * Local database only — never run against production.
 */
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const email = "walkthrough-demo@fampire.local";
const password = "WalkthroughDemo!2026";

const existing = await api.find({ collection: "users", where: { email: { equals: email } }, limit: 1 });
if (existing.docs.length) {
  await api.update({ collection: "users", id: existing.docs[0].id, data: { password } });
  console.log("updated", email);
} else {
  await api.create({ collection: "users", data: { email, password, role: "admin" } });
  console.log("created", email);
}
process.exit(0);
