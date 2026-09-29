import type { Database } from "@/core/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type PermissionAction = Database["public"]["Enums"]["permission_action"];

function isStaffOrAdminRole(role: AppRole | null | undefined): boolean {
  return role === "super_admin" || role === "staff";
}

/** Where a user lands after signing in when no valid `next` path was requested. */
export function homePathForRole(role: AppRole | null | undefined): string {
  return isStaffOrAdminRole(role) ? "/admin" : "/account";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super admin",
  staff: "Staff",
  user: "User",
};
