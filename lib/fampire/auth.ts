/**
 * The FAMPIRE session seam.
 *
 * FAMPIRE's entire contract with authentication is one boolean: does this
 * reader see the held-back collections or the locked-card placeholder? Two
 * call sites consume it (the layout masthead and the Library), and nothing
 * else in the product knows an auth system exists.
 *
 * Until the Payload backend lands this returns false, which is the correct
 * public-press-room default: every public collection renders, every private
 * one renders as a locked card. Point this at Payload's session and the whole
 * product turns on with no other edit.
 */
export async function isSignedIn(): Promise<boolean> {
  return false;
}
