import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "hub-auth";

function hubPassword(): string {
  const v = process.env.HUB_PASSWORD;
  if (!v) throw new Error("Missing HUB_PASSWORD env");
  return v;
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

export function verifyPassword(supplied: string): boolean {
  if (!supplied) return false;
  const a = sha256(supplied);
  const b = sha256(hubPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns the cookie value the middleware checks for. */
export function authCookieValue(): string {
  // Deterministic, non-secret marker derived from the configured password.
  // Anyone who can read the cookie can also just supply the password.
  return sha256(hubPassword()).toString("hex").slice(0, 32);
}

export function isAuthenticated(): boolean {
  const c = cookies().get(AUTH_COOKIE);
  return c?.value === authCookieValue();
}
