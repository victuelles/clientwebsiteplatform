import { NextResponse, type NextRequest } from "next/server";

import { signInPath } from "@/core/auth/redirects";
import { hasSessionCookie, updateSession } from "@/core/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Optimistic check, a speed optimisation ONLY: skip rendering /admin for visitors with no
  // session cookie at all. It is not security. The real checks are the server guards
  // (src/core/access) and Row Level Security, which run on every request regardless.
  if (request.nextUrl.pathname.startsWith("/admin") && !hasSessionCookie(request)) {
    const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(signInPath(target), request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Every path except static assets, image optimization, the health check, and common files.
    "/((?!_next/static|_next/image|api/health|brand-icon|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
