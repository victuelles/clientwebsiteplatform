import { Constants, type Database } from "@/core/supabase/database.types";

/**
 * Every permission scope, matching public.permission_scopes exactly (enforced by
 * scopes.int.test.ts). Phase 5 grows this into the module registry.
 */
export const SCOPES = [
  { key: "content", label: "Homepage and pages", kind: "core", sortOrder: 10 },
  { key: "media", label: "Media library", kind: "core", sortOrder: 20 },
  { key: "blog", label: "Blog", kind: "module", sortOrder: 100 },
  { key: "photo_gallery", label: "Photo gallery", kind: "module", sortOrder: 110 },
  { key: "video_gallery", label: "Video gallery", kind: "module", sortOrder: 120 },
  { key: "shop", label: "Shop", kind: "module", sortOrder: 130 },
  { key: "directory", label: "Business directory", kind: "module", sortOrder: 140 },
  { key: "inventory", label: "Inventory", kind: "module", sortOrder: 150 },
  { key: "crm", label: "CRM", kind: "module", sortOrder: 160 },
  { key: "booking", label: "Booking", kind: "module", sortOrder: 170 },
  { key: "email_marketing", label: "Email marketing", kind: "module", sortOrder: 180 },
] as const satisfies readonly ScopeDefinition[];

export type ScopeKind = "core" | "module";
type ScopeDefinition = { key: string; label: string; kind: ScopeKind; sortOrder: number };

export type Scope = (typeof SCOPES)[number];
export type ScopeKey = Scope["key"];
export type ModuleScopeKey = Extract<Scope, { kind: "module" }>["key"];

export type PermissionAction = Database["public"]["Enums"]["permission_action"];

/** Every action, in the order of the permission_action enum. */
export const ACTIONS: readonly PermissionAction[] = Constants.public.Enums.permission_action;

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  publish: "Publish",
};

const SCOPE_BY_KEY = new Map<string, Scope>(SCOPES.map((scope) => [scope.key, scope]));

export function getScope(key: string): Scope | undefined {
  return SCOPE_BY_KEY.get(key);
}

export function isScopeKey(key: string): key is ScopeKey {
  return SCOPE_BY_KEY.has(key);
}

export function isModuleScope(key: string): key is ModuleScopeKey {
  return SCOPE_BY_KEY.get(key)?.kind === "module";
}

export function isPermissionAction(value: string): value is PermissionAction {
  return (ACTIONS as readonly string[]).includes(value);
}
