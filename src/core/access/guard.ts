import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { signInPath } from "@/core/auth/redirects";
import type { Profile } from "@/core/auth/session";

import { getAccessContext, type AccessContext } from "./context";
import type { AccessDecision, AccessRequirement, RoleRequirement } from "./decide";
import type { PermissionAction, ScopeKey } from "./scopes";

// Guards for Server Components, pages, and layouts. Every admin page uses one of these.

export const DISABLED_ACCOUNT_PATH = "/auth/disabled";
export const NOT_AUTHORIZED_PATH = "/not-authorized";

/** The current path (set by src/proxy.ts), used as the post-sign-in `next` target. */
async function currentPath(): Promise<string | undefined> {
  return (await headers()).get("x-pathname") ?? undefined;
}

async function enforce(decision: AccessDecision): Promise<void> {
  switch (decision) {
    case "allowed":
    case "module_disabled":
      return;
    case "unauthenticated":
      redirect(signInPath(await currentPath()));
    case "inactive":
      redirect(DISABLED_ACCOUNT_PATH);
    case "forbidden":
      redirect(NOT_AUTHORIZED_PATH);
  }
}

export type AccessGrant = {
  context: AccessContext & { profile: Profile };
  /**
   * True only for the super admin on a disabled module. The page must then render
   * <ModuleDisabledNotice /> instead of its content. Staff get a 404 instead.
   */
  moduleDisabled: boolean;
};

/**
 * Requires `action` on `scope`. Redirects to sign-in (signed out), /auth/disabled (inactive), or
 * /not-authorized (no permission). A disabled module is a 404 for staff; the super admin gets
 * `moduleDisabled: true` and sees a notice.
 */
export async function requireAccess(requirement: {
  scope: ScopeKey;
  action: PermissionAction;
}): Promise<AccessGrant> {
  const context = await getAccessContext();
  const decision = context.check(requirement);
  await enforce(decision);

  if (decision === "module_disabled") {
    if (context.profile?.role !== "super_admin") notFound();
    return { context: context as AccessGrant["context"], moduleDisabled: true };
  }
  return { context: context as AccessGrant["context"], moduleDisabled: false };
}

async function requireRole(role: RoleRequirement): Promise<AccessContext & { profile: Profile }> {
  const context = await getAccessContext();
  await enforce(context.check({ role } satisfies AccessRequirement));
  return context as AccessContext & { profile: Profile };
}

/** Super-admin-only areas: settings, staff, modules, audit log. */
export async function requireSuperAdmin() {
  return requireRole("super_admin");
}

/** The /admin shell: any active staff member or the super admin. */
export async function requireStaffOrAdmin() {
  return requireRole("staff_or_admin");
}

/** Any signed-in, active user (e.g. /account). */
export async function requireUser() {
  return requireRole("signed_in");
}
