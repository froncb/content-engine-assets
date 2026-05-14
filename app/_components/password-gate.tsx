"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/cn";

export default function PasswordGate({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Wrong password.");
      return;
    }
    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen grid place-items-center bg-ink-900 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-ink-300 mb-8">
          <LockKeyhole size={16} />
          <span className="text-xs uppercase tracking-[0.18em]">PHNTM Asset Hub</span>
        </div>
        <h1 className="text-2xl text-ink-50 font-semibold tracking-tight mb-1">
          Sign in to continue
        </h1>
        <p className="text-sm text-ink-400 mb-8">
          Single-password gate. Cookie persists 30 days.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              "w-full rounded-md bg-ink-800 border border-ink-700",
              "px-3 py-2.5 text-ink-50 placeholder:text-ink-400",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40",
            )}
            autoFocus
          />
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !password}
            className={cn(
              "w-full rounded-md bg-accent text-ink-900 font-medium",
              "py-2.5 hover:bg-accent-dim transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
