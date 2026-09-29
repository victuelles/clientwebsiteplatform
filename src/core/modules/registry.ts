import { SCOPES, type PermissionAction } from "@/core/access/scopes";
import type { SectionDefinition } from "@/core/sections/types";
import { blogModule } from "@/modules/blog/module";
import { bookingModule } from "@/modules/booking/module";
import { crmModule } from "@/modules/crm/module";
import { directoryModule } from "@/modules/directory/module";
import { emailMarketingModule } from "@/modules/email_marketing/module";
import { inventoryModule } from "@/modules/inventory/module";
import { photoGalleryModule } from "@/modules/photo_gallery/module";
import { shopModule } from "@/modules/shop/module";
import { videoGalleryModule } from "@/modules/video_gallery/module";

import type { ModuleAccountNavItem, ModuleAdminNavItem, ModuleKey, ModuleManifest } from "./types";

// THE module registry (client-safe). Core code finds modules only through this file (and
// registry.server.ts for server functions); it never imports src/modules directly.
// To add a module: create src/modules/<key>/module.ts and add it here (see CLAUDE.md).

const MANIFESTS: readonly ModuleManifest[] = [
  blogModule,
  photoGalleryModule,
  videoGalleryModule,
  shopModule,
  directoryModule,
  inventoryModule,
  crmModule,
  bookingModule,
  emailMarketingModule,
];

/** Module scope keys from the Phase 2 scope list (which mirrors public.permission_scopes). */
export const MODULE_SCOPE_KEYS: readonly string[] = SCOPES.filter((s) => s.kind === "module").map(
  (s) => s.key,
);

const PUBLIC_ROUTE_PATTERN = /^\/[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Checks a registry for mistakes. Returns readable problems (empty when valid). Runs in a unit
 * test and when this file loads, so `next build` fails on an invalid registry.
 */
export function validateRegistry(
  modules: readonly ModuleManifest[],
  scopeKeys: readonly string[] = MODULE_SCOPE_KEYS,
): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();

  for (const m of modules) {
    if (keys.has(m.key)) problems.push(`Duplicate module key "${m.key}".`);
    keys.add(m.key);
    if (!scopeKeys.includes(m.key))
      problems.push(`Module "${m.key}" has no module permission scope (add it in a migration).`);
    if (!m.actions.includes("view")) problems.push(`Module "${m.key}" must use the view action.`);
    for (const item of m.adminNav) {
      if (!m.actions.includes(item.action))
        problems.push(`Module "${m.key}" admin nav "${item.label}" needs an unused action.`);
      if (item.href !== `/admin/m/${m.key}` && !item.href.startsWith(`/admin/m/${m.key}/`))
        problems.push(
          `Module "${m.key}" admin nav "${item.label}" must live under /admin/m/${m.key}.`,
        );
    }
    for (const item of m.accountNav) {
      if (!item.href.startsWith("/account/"))
        problems.push(`Module "${m.key}" account nav "${item.label}" must live under /account/.`);
    }
    for (const route of m.publicRoutes) {
      if (!PUBLIC_ROUTE_PATTERN.test(route))
        problems.push(`Module "${m.key}" public route "${route}" must look like "/name".`);
    }
    for (const section of m.sectionTypes) {
      if (section.requiresModule && section.requiresModule !== m.key)
        problems.push(`Section "${section.key}" of "${m.key}" requires another module.`);
    }
  }

  for (const key of scopeKeys) {
    if (!keys.has(key)) problems.push(`Module scope "${key}" has no manifest.`);
  }

  const owners = new Map<string, string>();
  const feedOwners = new Map<string, string>();
  for (const m of modules) {
    for (const route of m.publicRoutes) {
      const owner = owners.get(route);
      if (owner && owner !== m.key)
        problems.push(`Public route "${route}" is owned by both "${owner}" and "${m.key}".`);
      owners.set(route, m.key);
    }
    for (const feed of m.feeds) {
      const owner = feedOwners.get(feed.key);
      if (owner) problems.push(`Feed "${feed.key}" is declared by both "${owner}" and "${m.key}".`);
      feedOwners.set(feed.key, m.key);
    }
    for (const required of m.requiresModules) {
      if (required === m.key) problems.push(`Module "${m.key}" requires itself.`);
      else if (!keys.has(required))
        problems.push(`Module "${m.key}" requires unknown module "${required}".`);
    }
    for (const other of m.worksWithModules) {
      if (!keys.has(other))
        problems.push(`Module "${m.key}" works with unknown module "${other}".`);
    }
  }

  const cycle = findDependencyCycle(modules);
  if (cycle) problems.push(`Dependency cycle: ${cycle.join(" → ")}.`);

  return problems;
}

/** The first requiresModules cycle found (["a", "b", "a"]), or null. */
export function findDependencyCycle(modules: readonly ModuleManifest[]): string[] | null {
  const byKey = new Map(modules.map((m) => [m.key as string, m]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (key: string): string[] | null => {
    if (state.get(key) === "done") return null;
    if (state.get(key) === "visiting") return [...stack.slice(stack.indexOf(key)), key];
    state.set(key, "visiting");
    stack.push(key);
    for (const next of byKey.get(key)?.requiresModules ?? []) {
      if (next === key) continue; // reported separately
      const found = visit(next);
      if (found) return found;
    }
    stack.pop();
    state.set(key, "done");
    return null;
  };

  for (const m of modules) {
    const found = visit(m.key);
    if (found) return found;
  }
  return null;
}

const problems = validateRegistry(MANIFESTS);
if (problems.length > 0) {
  throw new Error(`Invalid module registry:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
}

const BY_KEY = new Map<string, ModuleManifest>(MANIFESTS.map((m) => [m.key, m]));

/** Every module, in permission scope order. */
export function listModules(): readonly ModuleManifest[] {
  return MANIFESTS;
}

export function getModule(key: string): ModuleManifest | undefined {
  return BY_KEY.get(key);
}

export function isModuleKey(key: string): key is ModuleKey {
  return BY_KEY.has(key);
}

/** First path segments owned by modules ("blog", "shop", "cart", …), reserved as page slugs. */
export function reservedModulePaths(): string[] {
  return MANIFESTS.flatMap((m) => m.publicRoutes.map((route) => route.slice(1)));
}

/** The module owning a public path ("/shop/item" → "shop"), if any. */
export function moduleForPath(pathname: string): ModuleKey | undefined {
  const segment = pathname.split("/")[1] ?? "";
  return MANIFESTS.find((m) => m.publicRoutes.includes(`/${segment}`))?.key;
}

/** The default page for a module link in the link picker (its first public route). */
export function modulePublicPath(key: string): string | undefined {
  return BY_KEY.get(key)?.publicRoutes[0];
}

export type RegistryAdminNavItem = ModuleAdminNavItem & { moduleKey: ModuleKey };
export type RegistryAccountNavItem = ModuleAccountNavItem & { moduleKey: ModuleKey };

export function adminNavItems(): RegistryAdminNavItem[] {
  return MANIFESTS.flatMap((m) => m.adminNav.map((item) => ({ ...item, moduleKey: m.key })));
}

export function accountNavItems(): RegistryAccountNavItem[] {
  return MANIFESTS.flatMap((m) => m.accountNav.map((item) => ({ ...item, moduleKey: m.key })));
}

/** Section type key → the module that contributes it. */
export function sectionTypesByModule(): Record<string, ModuleKey> {
  return Object.fromEntries(
    MANIFESTS.flatMap((m) => m.sectionTypes.map((section) => [section.key, m.key])),
  );
}

/** Section definitions contributed by modules, marked with the module they require. */
export function moduleSectionDefinitions(): SectionDefinition[] {
  return MANIFESTS.flatMap((m) =>
    m.sectionTypes.map((section) => ({ ...section, requiresModule: m.key })),
  );
}

/** Every declared feed source with its module. */
export function feedSources(): { key: string; label: string; moduleKey: ModuleKey }[] {
  return MANIFESTS.flatMap((m) => m.feeds.map((feed) => ({ ...feed, moduleKey: m.key })));
}

/** Modules that list `key` in requiresModules. */
export function dependentsOf(key: string): ModuleManifest[] {
  return MANIFESTS.filter((m) => (m.requiresModules as readonly string[]).includes(key));
}

/** The actions a scope uses: a module's declared actions, or all of them for core scopes. */
export function actionsForScope(
  scope: string,
  all: readonly PermissionAction[],
): readonly PermissionAction[] {
  return BY_KEY.get(scope)?.actions ?? all;
}
