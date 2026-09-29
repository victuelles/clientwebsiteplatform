import "server-only";

import { notFound } from "next/navigation";

import { getModule } from "./registry";
import { isModuleEnabled } from "./registry.server";
import type { ModuleKey, ModuleManifest } from "./types";

/**
 * For a module's public routes (use it in the module's public layout and pages): renders the
 * site's 404 page while the module is off. Returns the manifest.
 */
export async function requireModulePublic(key: ModuleKey): Promise<ModuleManifest> {
  const manifest = getModule(key);
  if (!manifest || !(await isModuleEnabled(key))) notFound();
  return manifest;
}

/**
 * For webhooks and server tasks that use the admin client (which bypasses RLS). Throws while the
 * module is off. Webhooks may still record events for records that already exist (a payment for
 * an order placed before the module was turned off) but must never start new operations; call
 * this before anything that creates or changes module data on its own.
 */
export async function requireModuleEnabled(key: ModuleKey): Promise<void> {
  if (!(await isModuleEnabled(key))) throw new ModuleDisabledError(key);
}

export class ModuleDisabledError extends Error {
  constructor(public readonly moduleKey: string) {
    super(`The ${moduleKey} module is turned off.`);
    this.name = "ModuleDisabledError";
  }
}
