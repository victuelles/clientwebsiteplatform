import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/core/supabase/database.types";

import { maybeBootstrapSuperAdmin } from "./bootstrap-server";
import { safeNextPath, signInPath } from "./redirects";
import { homePathForRole } from "./roles";

/**
 * Runs after any successful sign-in (password, magic link, email confirmation, code exchange):
 * bootstraps the super admin if eligible, then returns where to send the user. Deactivated
 * accounts are signed out and sent back to sign-in.
 */
export async function finishSignIn(
  supabase: SupabaseClient<Database>,
  userId: string,
  next?: string | null,
): Promise<string> {
  try {
    await maybeBootstrapSuperAdmin(userId);
  } catch (error) {
    // Never block sign-in on bootstrap problems; the user just stays a regular user.
    console.error(error);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return signInPath(null, "account_disabled");
  }

  return safeNextPath(next) ?? homePathForRole(profile.role);
}
