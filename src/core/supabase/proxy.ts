import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/core/env";

import type { Database } from "./database.types";

/**
 * Refreshes the Supabase auth session on every request and forwards updated cookies to both the
 * request (for Server Components) and the response (for the browser).
 *
 * Only refreshes the session; route protection is added by the access guard in Phase 2.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cache-busting headers so a CDN never serves one user's refreshed session to another.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): getClaims() validates the JWT and
  // triggers the refresh that writes the new cookies above.
  await supabase.auth.getClaims();

  return response;
}
