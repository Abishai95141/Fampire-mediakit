import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Create (or reset) an admin account for /admin.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npx payload run scripts/create-admin.ts
 *
 * `npm run setup` calls this with whatever you type at its prompt; run it
 * directly to add a second admin or to reset a forgotten password.
 *
 * The credentials arrive in the ENVIRONMENT rather than argv because
 * `payload run` owns the CLI argument list and silently drops flags it does
 * not recognise — a `--password` would never reach this file.
 *
 * Idempotent on email: an existing account has its password reset and is
 * promoted to admin, so re-running is a recovery path, not an error.
 */

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are both required.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;

const existing = await api.find({
  collection: "users",
  where: { email: { equals: email } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
});

if (existing.docs.length) {
  await api.update({
    collection: "users",
    id: existing.docs[0].id,
    data: { password, role: "admin" },
    depth: 0,
    overrideAccess: true,
  });
  console.log(`admin password reset: ${email}`);
} else {
  await api.create({
    collection: "users",
    data: { email, password, role: "admin" },
    depth: 0,
    overrideAccess: true,
  });
  console.log(`admin created: ${email}`);
}

process.exit(0);
