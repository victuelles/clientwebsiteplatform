"use client";

import { createContext, useContext, useMemo } from "react";

import type { AppRole } from "@/core/auth/roles";

import { decide, isModuleEnabled, type AccessFacts, type Permission } from "./decide";
import type { PermissionAction, ScopeKey } from "./scopes";

// NOT A SECURITY BOUNDARY. This context exists only to hide buttons and nav items the user
// cannot use. Every page, server action, and route handler re-checks access on the server
// (requireAccess / protectedAction / protectedRoute), and RLS enforces it again in the database.

export type ClientAccessFacts = {
  role: AppRole;
  permissions: Permission[];
  modules: Record<string, boolean>;
};

type PermissionsValue = {
  role: AppRole;
  isSuperAdmin: boolean;
  /** True when the module is enabled and the user holds the permission (UI hiding only). */
  can: (scope: ScopeKey, action: PermissionAction) => boolean;
  moduleEnabled: (scope: ScopeKey) => boolean;
  /** Enabled flag per module key. */
  modules: Readonly<Record<string, boolean>>;
};

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({
  value,
  children,
}: {
  value: ClientAccessFacts;
  children: React.ReactNode;
}) {
  const permissions = useMemo<PermissionsValue>(() => {
    const facts: AccessFacts = {
      profile: { role: value.role, is_active: true },
      permissions: value.permissions,
      modules: value.modules,
    };
    return {
      role: value.role,
      isSuperAdmin: value.role === "super_admin",
      can: (scope, action) => decide(facts, { scope, action }) === "allowed",
      moduleEnabled: (scope) => isModuleEnabled(facts, scope),
      modules: value.modules,
    };
  }, [value]);

  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>;
}

/** For hiding UI only; never for security. See the note at the top of this file. */
export function usePermissions(): PermissionsValue {
  const value = useContext(PermissionsContext);
  if (!value) throw new Error("usePermissions() must be used inside <PermissionsProvider>.");
  return value;
}
