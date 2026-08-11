import { NextResponse } from "next/server";

/**
 * The FAMPIRE auth seam.
 *
 * components/fampire/LoginForm.tsx POSTs {email, password} here and expects
 * either 2xx (signed in; the session cookie is set by this handler) or a JSON
 * body {error} to display. Nothing else in FAMPIRE talks to auth — the read
 * side is the single boolean in lib/fampire/auth.ts.
 *
 * Replace this handler with Payload's login when the backend lands.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Sign-in is not available yet. Contact the media team." },
    { status: 501 },
  );
}
