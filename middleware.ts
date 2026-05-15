import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const allowlist = (process.env.HUB_ALLOWLIST || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const PUBLIC_PATHS = ["/sign-in", "/access-denied", "/sign-up", "/api/clerk-webhook"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  const email = (
    (sessionClaims?.email as string | undefined) ||
    (sessionClaims?.email_address as string | undefined) ||
    ""
  ).toLowerCase();

  if (!allowlist.includes(email)) {
    const url = req.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
