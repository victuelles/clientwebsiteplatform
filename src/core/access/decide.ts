import type { AppRole } from "@/core/auth/roles";

import { getScope, isScopeKey, type PermissionAction, type ScopeKey } from "./scopes";

// Pure access decisions. All decision logic lives here so it can be unit tested without a
// database, and so the server guard and the client PermissionsProvider agree exactly.

export type AccessDecision =
  "allowed" | "unauthenticated" | "inactive" | "forbidden" | "module_disabled";

export type AccessProfile = { role: AppRole; is_active: boolean } | null;

export type Permission = { scope: string; action: PermissionAction };

/** What a page, action, or route requires. */
export type AccessRequirement =
  | { scope: ScopeKey; action: PermissionAction; role?: never }
  | { role: RoleRequirement; scope?: never; action?: never };

/** Role-only requirements, for areas that are not permission scopes. */
export type RoleRequirement = "super_admin" | "staff_or_admin" | "signed_in";

export function hasPermission(
  permissions: readonly Permission[],
  scope: string,
  action: PermissionAction,
): boolean {
  return permissions.some((p) => p.scope === scope && p.action === action);
}

/**
 * Decides whether `profile` may perform `action` on `scope`.
 * Order: signed in -> active -> staff or super admin -> known scope -> module enabled ->
 * permission (the super admin holds every permission).
 */
export function decideAccess(input: {
  profile: AccessProfile;
  permissions: readonly Permission[];
  moduleEnabled: boolean;
  scope: string;
  action: PermissionAction;
}): AccessDecision {
  const { profile, permissions, moduleEnabled, scope, action } = input;

  if (!profile) return "unauthenticated";
  if (!profile.is_active) return "inactive";
  if (profile.role !== "super_admin" && profile.role !== "staff") return "forbidden";
  if (!isScopeKey(scope)) return "forbidden";
  if (!moduleEnabled) return "module_disabled";
  if (profile.role === "super_admin") return "allowed";
  return hasPermission(permissions, scope, action) ? "allowed" : "forbidden";
}

/** Decides a role-only requirement. */
export function decideRole(profile: AccessProfile, requirement: RoleRequirement): AccessDecision {
  if (!profile) return "unauthenticated";
  if (!profile.is_active) return "inactive";
  switch (requirement) {
    case "signed_in":
      return "allowed";
    case "staff_or_admin":
      return profile.role === "super_admin" || profile.role === "staff" ? "allowed" : "forbidden";
    case "super_admin":
      return profile.role === "super_admin" ? "allowed" : "forbidden";
  }
}

/** Facts needed to decide any requirement. Plain data, so it can cross to the client. */
export type AccessFacts = {
  profile: AccessProfile;
  permissions: readonly Permission[];
  /** enabled flag per module scope; core scopes are always enabled. */
  modules: Readonly<Record<string, boolean>>;
};

/** Core scopes are always enabled; module scopes follow `modules`; unknown scopes are not. */
export function isModuleEnabled(facts: Pick<AccessFacts, "modules">, scope: string): boolean {
  const definition = getScope(scope);
  if (!definition) return false;
  return definition.kind === "core" || facts.modules[scope] === true;
}

export function decide(facts: AccessFacts, requirement: AccessRequirement): AccessDecision {
  if (requirement.role) return decideRole(facts.profile, requirement.role);
  return decideAccess({
    profile: facts.profile,
    permissions: facts.permissions,
    moduleEnabled: isModuleEnabled(facts, requirement.scope),
    scope: requirement.scope,
    action: requirement.action,
  });
}
