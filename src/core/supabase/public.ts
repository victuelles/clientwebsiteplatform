import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/core/env";

import type { Database } from "./database.types";

/**
 * Supabase client for PUBLIC data (readable by anon under RLS), with responses stored in the
 * Next.js Data Cache under `tags`. No cookies: every visitor shares the cached result, so never
 * use it for anything user-specific. Invalidate with updateTag()/revalidateTag() on the tags.
 */
export function createCachedPublicClient(tags: string[]) {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "force-cache", next: { tags } }),
      },
    },
  );
}
