import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "hub-auth";

async function authCookieValue(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

const PUBLIC_PATHS = new Set<string>(["/", "/api/auth", "/api/health"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pw = process.env.HUB_PASSWORD;
  if (!pw) {
    // Fail closed — without a configured password we can't authenticate anything.
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }

  const expected = await authCookieValue(pw);
  const supplied = req.cookies.get(AUTH_COOKIE)?.value;
  if (supplied && supplied === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
