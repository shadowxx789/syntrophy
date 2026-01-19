import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/accessGuard";

/**
 * Middleware configuration
 * Excludes static files, API routes, and the unlock page itself
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - icons, images, and other static assets
     * - unlock page (login page itself)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|icons|unlock).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const password = process.env.ACCESS_PASSWORD?.trim();

  // If no password is configured, skip authentication entirely
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow access to unlock page and its resources
  if (pathname === "/unlock" || pathname.startsWith("/unlock/")) {
    return NextResponse.next();
  }

  // Get the access token from cookie
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  // Verify the token
  const isValid = await verifyAccessToken(accessToken, password);

  if (!isValid) {
    // Redirect to unlock page
    const unlockUrl = new URL("/unlock", request.url);
    // Preserve the original URL to redirect back after unlock
    unlockUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(unlockUrl);
  }

  return NextResponse.next();
}
