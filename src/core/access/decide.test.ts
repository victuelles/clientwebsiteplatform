import { describe, expect, it } from "vitest";

import {
  decide,
  decideAccess,
  decideRole,
  type AccessDecision,
  type AccessProfile,
  type Permission,
} from "./decide";

type Actor = { name: string; profile: AccessProfile; permissions: Permission[] };

const withPermission: Permission[] = [
  { scope: "content", action: "edit" },
  { scope: "blog", action: "edit" },
];

const ACTORS: Actor[] = [
  { name: "anon", profile: null, permissions: [] },
  { name: "user", profile: { role: "user", is_active: true }, permissions: [] },
  {
    name: "inactive staff",
    profile: { role: "staff", is_active: false },
    permissions: withPermission,
  },
  {
    name: "staff with permission",
    profile: { role: "staff", is_active: true },
    permissions: withPermission,
  },
  {
    name: "staff without permission",
    profile: { role: "staff", is_active: true },
    permissions: [],
  },
  { name: "super admin", profile: { role: "super_admin", is_active: true }, permissions: [] },
];

const TARGETS = [
  { name: "core scope", scope: "content", moduleEnabled: true },
  { name: "enabled module", scope: "blog", moduleEnabled: true },
  { name: "disabled module", scope: "blog", moduleEnabled: false },
] as const;

// Expected decision for each actor (rows) and target (columns: core, enabled, disabled).
const EXPECTED: Record<string, [AccessDecision, AccessDecision, AccessDecision]> = {
  anon: ["unauthenticated", "unauthenticated", "unauthenticated"],
  user: ["forbidden", "forbidden", "forbidden"],
  "inactive staff": ["inactive", "inactive", "inactive"],
  "staff with permission": ["allowed", "allowed", "module_disabled"],
  "staff without permission": ["forbidden", "forbidden", "module_disabled"],
  "super admin": ["allowed", "allowed", "module_disabled"],
};

describe("decideAccess", () => {
  for (const actor of ACTORS) {
    TARGETS.forEach((target, index) => {
      const expected = EXPECTED[actor.name]![index]!;
      it(`${actor.name} editing a ${target.name} -> ${expected}`, () => {
        expect(
          decideAccess({
            profile: actor.profile,
            permissions: actor.permissions,
            moduleEnabled: target.moduleEnabled,
            scope: target.scope,
            action: "edit",
          }),
        ).toBe(expected);
      });
    });
  }

  it("staff need the exact action, not just any permission on the scope", () => {
    expect(
      decideAccess({
        profile: { role: "staff", is_active: true },
        permissions: [{ scope: "content", action: "view" }],
        moduleEnabled: true,
        scope: "content",
        action: "delete",
      }),
    ).toBe("forbidden");
  });

  it("unknown scopes are forbidden, even for the super admin", () => {
    expect(
      decideAccess({
        profile: { role: "super_admin", is_active: true },
        permissions: [],
        moduleEnabled: true,
        scope: "not_a_scope",
        action: "view",
      }),
    ).toBe("forbidden");
  });
});

describe("decideRole", () => {
  const cases: [string, AccessProfile, AccessDecision, AccessDecision, AccessDecision][] = [
    // name, profile, signed_in, staff_or_admin, super_admin
    ["anon", null, "unauthenticated", "unauthenticated", "unauthenticated"],
    ["user", { role: "user", is_active: true }, "allowed", "forbidden", "forbidden"],
    ["inactive user", { role: "user", is_active: false }, "inactive", "inactive", "inactive"],
    ["staff", { role: "staff", is_active: true }, "allowed", "allowed", "forbidden"],
    ["super admin", { role: "super_admin", is_active: true }, "allowed", "allowed", "allowed"],
  ];
  for (const [name, profile, signedIn, staffOrAdmin, superAdmin] of cases) {
    it(`${name}`, () => {
      expect(decideRole(profile, "signed_in")).toBe(signedIn);
      expect(decideRole(profile, "staff_or_admin")).toBe(staffOrAdmin);
      expect(decideRole(profile, "super_admin")).toBe(superAdmin);
    });
  }
});

describe("decide (with module states)", () => {
  const facts = {
    profile: { role: "staff", is_active: true } as const,
    permissions: withPermission,
    modules: { blog: false, shop: true },
  };

  it("treats core scopes as always enabled", () => {
    expect(decide(facts, { scope: "content", action: "edit" })).toBe("allowed");
  });

  it("uses the modules map for module scopes", () => {
    expect(decide(facts, { scope: "blog", action: "edit" })).toBe("module_disabled");
    expect(decide({ ...facts, modules: { blog: true } }, { scope: "blog", action: "edit" })).toBe(
      "allowed",
    );
  });

  it("treats a module missing from the map as disabled", () => {
    expect(decide({ ...facts, modules: {} }, { scope: "blog", action: "edit" })).toBe(
      "module_disabled",
    );
  });

  it("supports role requirements", () => {
    expect(decide(facts, { role: "super_admin" })).toBe("forbidden");
    expect(decide(facts, { role: "staff_or_admin" })).toBe("allowed");
  });
});
