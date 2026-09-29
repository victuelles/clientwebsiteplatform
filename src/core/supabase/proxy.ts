import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/core/env";

import type { Database } from "./database.types";

/** Forwards the request (with any refreshed cookies) plus x-pathname for the server guards. */
function next(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

/** True if the request carries a Supabase auth cookie (possibly chunked: .0, .1, ...). */
export function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && /-auth-token(\.\d+)?$/.test(name));
}

/**
 * Refreshes the Supabase auth session on every request and forwards updated cookies to both the
 * request (for Server Components) and the response (for the browser).
 */
export async function updateSession(request: NextRequest) {
  let response = next(request);

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
          response = next(request);
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
