import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

/**
 * The FAMPIRE auth seam.
 *
 * components/fampire/LoginForm.tsx POSTs {email, password} here and expects
 * either 2xx (signed in; the session cookie is set by this handler) or a JSON
 * body {error} to display. That path is a bare string literal in the component
 * — the one coupling no compiler catches (§2.6) — so this route keeps its
 * address permanently.
 *
 * It delegates to Payload rather than owning any identity of its own: same
 * user table, same cookie, same roles as `/admin`. Signing in here signs you
 * into the admin and vice versa, which is the point — three disconnected
 * notions of "signed in" is how a system starts contradicting itself.
 *
 * Note this is the app's own namespace. Payload's REST API lives at
 * `/payload-api/*`; the two never overlap.
 */

/** Payload's default session cookie. Changing `cookiePrefix` in the config
 *  changes this — they must stay in step. */
const COOKIE = "payload-token";

export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;

  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const result = await payload.login({
      collection: "users",
      data: { email, password },
    });

    if (!result?.token || !result.user) {
      return NextResponse.json({ error: "Sign-in failed." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: { email: result.user.email, role: (result.user as { role?: string }).role ?? null },
    });

    /**
     * `Secure` when the connection can carry it, not merely when NODE_ENV
     * says production.
     *
     * This was `secure: process.env.NODE_ENV === "production"`, and
     * `next start` sets NODE_ENV=production — so a production build served
     * over plain HTTP marked the cookie Secure, the browser silently dropped
     * it, and the sign-in "failed". Server-side it had succeeded: the login
     * returned 200 and issued a token. The only thing the person saw was
     * "Email or password is incorrect", which is the one explanation that
     * was not true.
     *
     * Decided from the REQUEST. A deployment behind a TLS-terminating proxy
     * says so in `x-forwarded-proto`; a direct HTTPS server says so in the
     * URL. Anything that is not plain-HTTP localhost keeps the flag, so a
     * spoofed header cannot strip it from a real host — the only case this
     * relaxes is the one where the cookie could never have worked anyway.
     */
    /**
     * `Secure` when the connection can actually carry it, not merely when
     * NODE_ENV says production.
     *
     * This was `secure: process.env.NODE_ENV === "production"`, and
     * `next start` sets NODE_ENV=production — so a production build served
     * over plain HTTP marked the cookie Secure, the browser silently dropped
     * it, and signing in "failed". Server-side it had SUCCEEDED: the login
     * returned 200 and issued a token. The only thing the person saw was
     * "Email or password is incorrect", which is the one explanation that
     * was not true.
     *
     * DECLARED, not sniffed — the same rule `DATABASE_SSL` follows in
     * payload.config.ts, and for the same reason. `SITE_URL` is the origin
     * this deployment says it serves from, so an HTTPS deployment keeps the
     * flag even behind a proxy that forgets `x-forwarded-proto`, and no
     * spoofed header can strip it. The forwarded header and the request's own
     * protocol are accepted as well, so a deployment that never set SITE_URL
     * still gets it right.
     *
     * The only case this relaxes is plain HTTP, where a Secure cookie could
     * never have reached the browser in the first place.
     */
    const declared = (process.env.SITE_URL ?? "").trim().toLowerCase();
    const forwarded = (request.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
    const own = new URL(request.url).protocol.replace(":", "").toLowerCase();
    const overHttps = declared.startsWith("https://") || forwarded === "https" || own === "https";

    response.cookies.set(COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: overHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    /**
     * Deliberately vague, and identical whether the address is unknown or the
     * password is wrong. A press room is a public target; the sign-in form
     * should not confirm which staff email addresses exist.
     */
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
}

/** Sign out. Clears the same cookie Payload set. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
