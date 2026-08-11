"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "@/lib/fampire/safe-next";

/**
 * The FAMPIRE sign-in form.
 *
 * Posts to /api/auth — the FAMPIRE auth seam (app/api/auth/route.ts), which
 * is a stub until the Payload backend lands. The form itself is final; only
 * the endpoint behind it changes.
 */
export default function FampireLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Sign-in failed");
      }
      // Land inside FAMPIRE by default.
      router.push(safeNextPath(next ?? "/fampire"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(false);
    }
  }

  const field =
    "w-full border-b-2 border-fam-rule bg-transparent pb-3 pt-1 text-[17px] text-fam-ink outline-none transition-colors placeholder:text-fam-faint focus:border-fam-ink";

  return (
    <form onSubmit={submit} className="mt-12 space-y-9">
      <div>
        <label htmlFor="fam-email" className="fam-eyebrow">
          Email
        </label>
        <input
          id="fam-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          placeholder="you@lollibrands.com"
          className={`${field} mt-2`}
        />
      </div>

      <div>
        <label htmlFor="fam-password" className="fam-eyebrow">
          Password
        </label>
        <input
          id="fam-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={`${field} mt-2`}
        />
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-fam-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-fam-ink py-4 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-85 disabled:opacity-35"
      >
        {pending ? "Signing in…" : "Enter the Media Center"}
      </button>
    </form>
  );
}
