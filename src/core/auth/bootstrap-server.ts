import "server-only";

import { env } from "@/core/env";
import { createAdminClient } from "@/core/supabase/admin";

import { shouldBootstrapSuperAdmin } from "./bootstrap";

/**
 * Called after every successful sign-in (password, magic link, email confirmation, code exchange).
 * Promotes the user to super admin if they are the configured SUPER_ADMIN_EMAIL, confirmed, and no
 * super admin exists yet. Otherwise does nothing; never demotes anyone. Returns true if promoted.
 */
export async function maybeBootstrapSuperAdmin(userId: string): Promise<boolean> {
  const configuredEmail = env.SUPER_ADMIN_EMAIL;
  if (!configuredEmail) return false;

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");
  if (countError) throw new Error(`Bootstrap check failed: ${countError.message}`);
  if ((count ?? 0) > 0) return false;

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData.user) return false;

  const promote = shouldBootstrapSuperAdmin({
    configuredEmail,
    userEmail: userData.user.email,
    emailConfirmed: Boolean(userData.user.email_confirmed_at),
    superAdminExists: false,
  });
  if (!promote) return false;

  const { data, error } = await admin.rpc("bootstrap_super_admin", {
    target_user: userId,
    expected_email: configuredEmail,
  });
  if (error) throw new Error(`Super admin bootstrap failed: ${error.message}`);
  return data === true;
}
