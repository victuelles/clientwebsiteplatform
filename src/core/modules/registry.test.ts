import { describe, expect, it } from "vitest";

import { SCOPES } from "@/core/access/scopes";
import { defineSection } from "@/core/sections/types";

import {
  accountNavItems,
  adminNavItems,
  dependentsOf,
  feedSources,
  findDependencyCycle,
  getModule,
  listModules,
  MODULE_SCOPE_KEYS,
  moduleForPath,
  reservedModulePaths,
  validateRegistry,
} from "./registry";
import type { ModuleManifest } from "./types";

function fixture(key: string, overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    key: key as ModuleManifest["key"],
    label: key,
    description: "",
    icon: "star",
    phase: 99,
    actions: ["view", "edit"],
    publicRoutes: [],
    adminNav: [{ label: key, href: `/admin/m/${key}`, icon: "star", action: "view" }],
    accountNav: [],
    sectionTypes: [],
    feeds: [],
    requiresModules: [],
    worksWithModules: [],
    requiredIntegrations: [],
    optionalIntegrations: [],
    ...overrides,
  } as ModuleManifest;
}

const req = (...keys: string[]) => keys as unknown as ModuleManifest["requiresModules"];

describe("the real registry", () => {
  it("is valid", () => {
    expect(validateRegistry(listModules())).toEqual([]);
  });

  it("has a manifest for every module scope, in scope order", () => {
    expect(listModules().map((m) => m.key)).toEqual(
      SCOPES.filter((s) => s.kind === "module").map((s) => s.key),
    );
  });

  it("uses the scope labels", () => {
    for (const m of listModules()) {
      expect(m.label).toBe(SCOPES.find((s) => s.key === m.key)?.label);
    }
  });

  it("has the relationships from the Phase 5 brief", () => {
    expect(getModule("email_marketing")?.requiresModules).toEqual(["crm"]);
    expect(getModule("email_marketing")?.requiredIntegrations).toEqual(["resend"]);
    expect(getModule("video_gallery")?.requiredIntegrations).toEqual(["mux"]);
    expect(getModule("shop")?.requiredIntegrations).toEqual(["stripe"]);
    expect(getModule("shop")?.worksWithModules).toEqual(["inventory", "crm"]);
    expect(getModule("booking")?.optionalIntegrations.map((i) => i.key)).toEqual(["stripe"]);
    expect(getModule("inventory")?.publicRoutes).toEqual([]);
    expect(getModule("crm")?.publicRoutes).toEqual([]);
    expect(dependentsOf("crm").map((m) => m.key)).toEqual(["email_marketing"]);
    expect(accountNavItems().map((i) => [i.moduleKey, i.label])).toEqual([
      ["shop", "My orders"],
      ["directory", "My listings"],
      ["booking", "My bookings"],
    ]);
    expect(feedSources()).toEqual([{ key: "blog", label: "Blog posts", moduleKey: "blog" }]);
  });

  it("gives each module an admin page under /admin/m/<key>", () => {
    expect(adminNavItems().map((i) => i.href)).toEqual(
      MODULE_SCOPE_KEYS.map((key) => `/admin/m/${key}`),
    );
  });

  it("derives reserved paths from public routes", () => {
    expect(reservedModulePaths().sort()).toEqual(
      ["blog", "booking", "cart", "checkout", "directory", "gallery", "shop", "videos"].sort(),
    );
  });

  it("finds the module owning a path", () => {
    expect(moduleForPath("/blog")).toBe("blog");
    expect(moduleForPath("/cart/items")).toBe("shop");
    expect(moduleForPath("/about")).toBeUndefined();
  });
});

describe("validateRegistry", () => {
  const scopes = ["a", "b", "c"];
  const valid = [fixture("a"), fixture("b"), fixture("c")];

  it("accepts a valid fixture", () => {
    expect(validateRegistry(valid, scopes)).toEqual([]);
  });

  it("rejects duplicate keys", () => {
    expect(validateRegistry([...valid, fixture("a")], scopes)).toContain(
      'Duplicate module key "a".',
    );
  });

  it("rejects keys that are not module scopes, and scopes without a manifest", () => {
    const problems = validateRegistry([fixture("a"), fixture("b"), fixture("zzz")], scopes);
    expect(problems).toContain(
      'Module "zzz" has no module permission scope (add it in a migration).',
    );
    expect(problems).toContain('Module scope "c" has no manifest.');
  });

  it("rejects two modules owning the same public path", () => {
    const problems = validateRegistry(
      [
        fixture("a", { publicRoutes: ["/shop"] }),
        fixture("b", { publicRoutes: ["/shop"] }),
        fixture("c"),
      ],
      scopes,
    );
    expect(problems).toContain('Public route "/shop" is owned by both "a" and "b".');
  });

  it("rejects malformed public paths", () => {
    const problems = validateRegistry(
      [fixture("a", { publicRoutes: ["shop"] }), fixture("b"), fixture("c")],
      scopes,
    );
    expect(problems).toContain('Module "a" public route "shop" must look like "/name".');
  });

  it("rejects unknown required modules and self-dependencies", () => {
    const problems = validateRegistry(
      [
        fixture("a", { requiresModules: req("nope") }),
        fixture("b", { requiresModules: req("b") }),
        fixture("c"),
      ],
      scopes,
    );
    expect(problems).toContain('Module "a" requires unknown module "nope".');
    expect(problems).toContain('Module "b" requires itself.');
  });

  it("rejects dependency cycles", () => {
    const modules = [
      fixture("a", { requiresModules: req("b") }),
      fixture("b", { requiresModules: req("c") }),
      fixture("c", { requiresModules: req("a") }),
    ];
    expect(findDependencyCycle(modules)).toEqual(["a", "b", "c", "a"]);
    expect(validateRegistry(modules, scopes)).toContain("Dependency cycle: a → b → c → a.");
  });

  it("allows shared dependencies without a cycle", () => {
    const modules = [
      fixture("a", { requiresModules: req("c") }),
      fixture("b", { requiresModules: req("c", "a") }),
      fixture("c"),
    ];
    expect(findDependencyCycle(modules)).toBeNull();
  });

  it("rejects nav items outside the module's paths or needing undeclared actions", () => {
    const problems = validateRegistry(
      [
        fixture("a", {
          adminNav: [{ label: "A", href: "/admin/other", icon: "star", action: "publish" }],
          accountNav: [{ label: "Mine", href: "/mine" }],
        }),
        fixture("b", { actions: ["edit"] }),
        fixture("c"),
      ],
      scopes,
    );
    expect(problems).toContain('Module "a" admin nav "A" needs an unused action.');
    expect(problems).toContain('Module "a" admin nav "A" must live under /admin/m/a.');
    expect(problems).toContain('Module "a" account nav "Mine" must live under /account/.');
    expect(problems).toContain('Module "b" must use the view action.');
  });

  it("rejects duplicate feed keys and unknown soft relationships", () => {
    const problems = validateRegistry(
      [
        fixture("a", { feeds: [{ key: "news", label: "News" }] }),
        fixture("b", { feeds: [{ key: "news", label: "News" }], worksWithModules: req("x") }),
        fixture("c"),
      ],
      scopes,
    );
    expect(problems).toContain('Feed "news" is declared by both "a" and "b".');
    expect(problems).toContain('Module "b" works with unknown module "x".');
  });

  it("rejects a contributed section that requires a different module", () => {
    const section = defineSection({
      key: "a_list",
      label: "List",
      description: "",
      icon: "star",
      schema: {} as never,
      fields: [],
      defaults: {} as never,
      backgrounds: ["white"],
      defaultBackground: "white",
      requiresModule: "b",
    });
    const problems = validateRegistry(
      [fixture("a", { sectionTypes: [section] }), fixture("b"), fixture("c")],
      scopes,
    );
    expect(problems).toContain('Section "a_list" of "a" requires another module.');
  });
});
