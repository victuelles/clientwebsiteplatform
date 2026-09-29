import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/core/env";

import type { Database } from "./database.types";

/**
 * Supabase client for Client Components. Uses the publishable key; Row Level Security applies.
 * `createBrowserClient` returns a singleton, so calling this repeatedly is cheap.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
