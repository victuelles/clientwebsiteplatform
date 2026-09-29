import type { z } from "zod";

import type { ModuleScopeKey, PermissionAction } from "@/core/access/scopes";
import type { IntegrationStatus } from "@/core/env";
import type { IconKey } from "@/core/icons/registry";
import type { FieldDef } from "@/core/sections/fields";
import type { FeedProvider } from "@/core/sections/feeds";
import type { SectionDefinition } from "@/core/sections/types";

// The contract every optional module fills in. A module's manifest is split in two files so the
// static part can be used in the browser (reserved slugs, the link picker, the admin nav):
//   src/modules/<key>/module.ts         ModuleManifest (client-safe data only)
//   src/modules/<key>/module.server.ts  ModuleServerManifest (optional; server functions)
// Core code reads both only through src/core/modules/registry(.server).ts.

export type ModuleKey = ModuleScopeKey;
export type IntegrationKey = keyof IntegrationStatus;

export type ModuleAdminNavItem = {
  label: string;
  /** Under /admin/m/<key>. */
  href: string;
  icon: IconKey;
  /** The permission needed to see the item (on this module's scope). */
  action: PermissionAction;
};

export type ModuleAccountNavItem = {
  label: string;
  /** Under /account/. */
  href: string;
};

/** Module settings: a Zod object plus field metadata for the Phase 4 form generator. */
export type ModuleSettingsDefinition<S extends z.ZodObject = z.ZodObject> = {
  schema: S;
  fields: FieldDef[];
};

export type ModuleManifest = {
  /** Matches public.permission_scopes.key and public.modules.key. */
  key: ModuleKey;
  label: string;
  description: string;
  icon: IconKey;
  /** The roadmap phase that builds the module (shown on placeholder pages). */
  phase: number;
  /** The permission actions this module uses (the staff permission matrix shows only these). */
  actions: readonly PermissionAction[];
  /** Base paths the module owns on the public site, e.g. ["/blog"]. Reserved as page slugs. */
  publicRoutes: readonly string[];
  adminNav: readonly ModuleAdminNavItem[];
  accountNav: readonly ModuleAccountNavItem[];
  /**
   * Page section types the module contributes. The core section registry adds them (hidden and
   * skipped while the module is off); renderers go in module.server.ts.
   */
  sectionTypes: readonly SectionDefinition[];
  /** Feed sources for the "Module feed" section; module.server.ts implements each one. */
  feeds: readonly { key: string; label: string }[];
  /** Hard dependencies: these must be enabled first (mirrored in public.module_dependencies). */
  requiresModules: readonly ModuleKey[];
  /** Soft relationships, shown for information only. */
  worksWithModules: readonly ModuleKey[];
  /** Integrations that must be configured before the module can be enabled. */
  requiredIntegrations: readonly IntegrationKey[];
  /** Integrations that unlock extra features, with what they unlock. */
  optionalIntegrations: readonly { key: IntegrationKey; unlocks: string }[];
  settings?: ModuleSettingsDefinition;
};

/** A labelled count for the disable dialog, e.g. { label: "posts", count: 14 }. */
export type ModuleDataCount = { label: string; count: number };

export type ModuleHealthWarning = {
  message: string;
  /** Where to fix it (e.g. the Integrations settings tab). */
  href?: string;
};

export type ModuleServerManifest = {
  key: ModuleKey;
  /** Feed providers for the "Module feed" section (one per `feeds` entry in the manifest). */
  feedProviders?: readonly FeedProvider[];
  /** Server component per contributed section type key. */
  sectionRenderers?: Readonly<Record<string, SectionRenderer>>;
  /** Counts shown in the disable dialog. Runs with the signed-in super admin's client. */
  getDataSummary?: () => Promise<ModuleDataCount[]>;
  /** Module-specific warnings (integration checks are added by getModuleHealth). */
  getHealth?: () => Promise<ModuleHealthWarning[]>;
};

// Loose on purpose: renderers are server components typed by each section's own props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SectionRenderer = (args: any) => Promise<React.ReactNode> | React.ReactNode;

export function defineModule<const M extends ModuleManifest>(manifest: M): M {
  return manifest;
}

export function defineModuleServer(manifest: ModuleServerManifest): ModuleServerManifest {
  return manifest;
}
