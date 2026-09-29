import type { AccessContext } from "./context";
import { decide, type AccessFacts } from "./decide";

/** Builds an AccessContext for unit tests. */
export function fakeContext(
  facts: Partial<AccessFacts> & {
    role?: "super_admin" | "staff" | "user" | null;
    active?: boolean;
  },
): AccessContext {
  const profile =
    facts.role === null || facts.role === undefined
      ? null
      : {
          id: "00000000-0000-4000-8000-0000000000aa",
          email: "someone@example.test",
          full_name: "Someone",
          avatar_url: null,
          role: facts.role,
          is_active: facts.active ?? true,
        };
  const base = { profile, permissions: facts.permissions ?? [], modules: facts.modules ?? {} };
  return { ...base, check: (requirement) => decide(base, requirement) };
}
