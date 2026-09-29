import type { NextRequest } from "next/server";

import { updateSession } from "@/core/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Every path except static assets, image optimization, the health check, and common files.
    "/((?!_next/static|_next/image|api/health|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
