import "server-only";

import { cache } from "react";

import { createClient } from "@/core/supabase/server";
import type { Tables } from "@/core/supabase/database.types";

export type CurrentUser = { id: string; email: string | null };
export type Profile = Pick<
  Tables<"profiles">,
  "id" | "email" | "full_name" | "avatar_url" | "role" | "is_active"
>;

/**
 * The signed-in user, verified with getClaims() (JWT signature checked against the project's
 * signing keys), or null. Never trusts an unverified session read. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
});

/**
 * The signed-in user's profile row, including inactive profiles. Read from the database on every
 * request (never from JWT claims) so role changes and deactivation apply immediately.
 */
export const getProfileIncludingInactive = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data;
});

/** The signed-in user's active profile, or null if signed out or deactivated. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const profile = await getProfileIncludingInactive();
  return profile?.is_active ? profile : null;
});
