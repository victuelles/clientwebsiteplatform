import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/core/env";

import type { Database } from "./database.types";

/**
 * Supabase client with the SECRET key. It bypasses Row Level Security.
 *
 * Only for trusted server tasks: webhooks, background jobs, and bootstrap scripts. Never use it
 * for normal user requests (use `@/core/supabase/server` instead) and never import it from a
 * Client Component; the "server-only" import above turns that into a build error.
 */
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
