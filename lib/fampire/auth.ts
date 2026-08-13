import config from "@payload-config";
import { headers as nextHeaders } from "next/headers";
import { getPayload } from "payload";

/**
 * The FAMPIRE session seam.
 *
 * FAMPIRE's entire contract with authentication is one boolean: does this
 * reader see the held-back collections, or the locked-card placeholder? Two
 * call sites consume it (the layout masthead and the Library), and nothing
 * else in the product knows an auth system exists.
 *
 * It now reads Payload's session, so there is ONE identity in this app rather
 * than three. Before this, `isSignedIn()` returned a hardcoded `false`,
 * `/api/auth` was a 501 stub, and Payload's real cookie auth sat at `/admin` —
 * which meant signing into the admin left you signed OUT on the site, and
 * `/fampire/login` was a page that could not succeed.
 *
 * What signing in does NOT do: gate anything public. Public press surfaces are
 * ungated permanently — no login, no form, no email capture in front of any
 * asset (§2.4). A session only reveals collections marked `private` to the
 * internal team that already has an account.
 */
export async function isSignedIn(): Promise<boolean> {
  return Boolean(await currentUser());
}

export type SessionUser = {
  id: number | string;
  email: string;
  name?: string | null;
  role?: "admin" | "approver" | "contributor" | null;
};

/**
 * The signed-in user, or null.
 *
 * Fails closed: any error resolving the session is treated as signed out. A
 * press room that renders MORE than it should on an error is the wrong
 * failure direction — held-back collections stay held back.
 */
export async function currentUser(): Promise<SessionUser | null> {
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: await nextHeaders() });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email as string,
      name: (user as { name?: string }).name ?? null,
      role: (user as { role?: SessionUser["role"] }).role ?? null,
    };
  } catch {
    return null;
  }
}

/** Only approvers and admins may publish, or confirm a contains-minor flag
 *  (§9.1). Mirrors the rule enforced in the Entries collection hooks. */
export async function canApprove(): Promise<boolean> {
  const user = await currentUser();
  return user?.role === "admin" || user?.role === "approver";
}
