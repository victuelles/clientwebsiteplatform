import "server-only";

import { redirect } from "next/navigation";

import { signInPath } from "./redirects";
import { isStaffOrAdminRole } from "./roles";
import { getProfileIncludingInactive, type Profile } from "./session";

// Temporary role guards. Phase 2 replaces these with requireAccess({ scope, action }) built on the
// SQL helpers (module status + permission + ownership).

export const DISABLED_ACCOUNT_PATH = "/auth/disabled";
export const NOT_AUTHORIZED_PATH = "/not-authorized";

/** Signed-in, active user. Redirects to sign-in, or signs out a deactivated account. */
export async function requireUser(next?: string): Promise<Profile> {
  const profile = await getProfileIncludingInactive();
  if (!profile) redirect(signInPath(next));
  if (!profile.is_active) redirect(DISABLED_ACCOUNT_PATH);
  return profile;
}

/** Active staff member or the super admin. */
export async function requireStaffOrAdmin(next?: string): Promise<Profile> {
  const profile = await requireUser(next);
  if (!isStaffOrAdminRole(profile.role)) redirect(NOT_AUTHORIZED_PATH);
  return profile;
}

/** The active super admin. */
export async function requireSuperAdmin(next?: string): Promise<Profile> {
  const profile = await requireUser(next);
  if (profile.role !== "super_admin") redirect(NOT_AUTHORIZED_PATH);
  return profile;
}
