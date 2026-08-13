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

    response.cookies.set(COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
