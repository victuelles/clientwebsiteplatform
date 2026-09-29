import "server-only";

import { cache } from "react";

import { getProfileIncludingInactive, type Profile } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

import {
  decide,
  type AccessDecision,
  type AccessFacts,
  type AccessRequirement,
  type Permission,
} from "./decide";

export type AccessContext = AccessFacts & {
  /** The full profile row (including inactive profiles), or null when signed out. */
  profile: Profile | null;
  /** Decides a requirement against this context. */
  check: (requirement: AccessRequirement) => AccessDecision;
};

/**
 * Everything the guard needs, loaded once per request: the profile (role, active flag), the
 * effective permissions (get_my_permissions), and the module states. The three reads run in
 * parallel after the session is verified.
 */
export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const profile = await getProfileIncludingInactive();
  if (!profile) return withCheck({ profile: null, permissions: [], modules: {} });

  const supabase = await createClient();
  const [permissionsResult, modulesResult] = await Promise.all([
    supabase.rpc("get_my_permissions"),
    supabase.from("modules").select("key, enabled"),
  ]);

  if (permissionsResult.error) {
    throw new Error(`Could not load permissions: ${permissionsResult.error.message}`);
  }
  if (modulesResult.error) {
    throw new Error(`Could not load modules: ${modulesResult.error.message}`);
  }

  const permissions: Permission[] = (permissionsResult.data ?? []).map((row) => ({
    scope: row.scope,
    action: row.action,
  }));
  const modules = Object.fromEntries(
    (modulesResult.data ?? []).map((row) => [row.key, row.enabled]),
  );

  return withCheck({ profile, permissions, modules });
});

function withCheck(facts: Omit<AccessContext, "check">): AccessContext {
  return { ...facts, check: (requirement) => decide(facts, requirement) };
}

/** The subset of the access context sent to the browser for UI hiding (PermissionsProvider). */
export function toClientAccessFacts(context: AccessContext & { profile: Profile }) {
  return {
    role: context.profile.role,
    permissions: [...context.permissions],
    modules: { ...context.modules },
  };
}
