import "server-only";

import { cache } from "react";

import { getIntegrationDetails } from "@/core/env";
import type { FeedProvider } from "@/core/sections/feeds";
import { createCachedPublicClient } from "@/core/supabase/public";
import { blogServer } from "@/modules/blog/module.server";

import { getModule, listModules } from "./registry";
import { moduleHealth } from "./rules";
import { MODULES_TAG } from "./tags";
import type {
  ModuleDataCount,
  ModuleHealthWarning,
  ModuleKey,
  ModuleServerManifest,
  SectionRenderer,
} from "./types";

// Server half of the module registry: enabled state (cached), feed providers, section renderers,
// data summaries, and health. Add a module's module.server.ts to SERVER_MANIFESTS.

const SERVER_MANIFESTS: readonly ModuleServerManifest[] = [blogServer];

const SERVER_BY_KEY = new Map<string, ModuleServerManifest>(
  SERVER_MANIFESTS.map((m) => [m.key, m]),
);

for (const server of SERVER_MANIFESTS) {
  const manifest = getModule(server.key);
  if (!manifest) throw new Error(`module.server.ts for unknown module "${server.key}".`);
  const declared = manifest.feeds.map((f) => f.key).sort();
  const provided = (server.feedProviders ?? []).map((p) => p.key).sort();
  if (declared.join() !== provided.join())
    throw new Error(
      `Module "${server.key}" declares feeds [${declared}] but provides [${provided}].`,
    );
}

/**
 * Enabled flag for every module, read through the cookie-less cached client (tag "modules").
 * set_module_enabled's action expires the tag, so the public site updates immediately.
 */
export const getEnabledModules = cache(async (): Promise<Record<ModuleKey, boolean>> => {
  const { data, error } = await createCachedPublicClient([MODULES_TAG])
    .from("modules")
    .select("key, enabled");
  if (error) console.error(`Could not load modules: ${error.message}`);
  const enabled = new Map((data ?? []).map((row) => [row.key, row.enabled]));
  return Object.fromEntries(
    listModules().map((m) => [m.key, enabled.get(m.key) === true]),
  ) as Record<ModuleKey, boolean>;
});

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  return (await getEnabledModules())[key] === true;
}

/** Every feed provider from every module (enabled or not; callers check the module). */
export function listFeedProviders(): FeedProvider[] {
  return SERVER_MANIFESTS.flatMap((m) => m.feedProviders ?? []);
}

/** Renderers for section types contributed by modules. */
export function moduleSectionRenderers(): Record<string, SectionRenderer> {
  return Object.assign({}, ...SERVER_MANIFESTS.map((m) => m.sectionRenderers ?? {}));
}

/** Counts for the disable dialog ("14 posts, 3 drafts"); empty when the module has none. */
export async function getModuleDataSummary(key: string): Promise<ModuleDataCount[]> {
  const summary = SERVER_BY_KEY.get(key)?.getDataSummary;
  if (!summary) return [];
  try {
    return await summary();
  } catch (error) {
    console.error(`Data summary for "${key}" failed:`, error);
    return [];
  }
}

/** Required integrations that are missing plus the module's own getHealth warnings. */
export async function getModuleHealth(key: string): Promise<ModuleHealthWarning[]> {
  const manifest = getModule(key);
  if (!manifest) return [];
  let extra: ModuleHealthWarning[] = [];
  const getHealth = SERVER_BY_KEY.get(key)?.getHealth;
  if (getHealth) {
    try {
      extra = await getHealth();
    } catch (error) {
      console.error(`Health check for "${key}" failed:`, error);
      extra = [{ message: `${manifest.label} could not check its health. See the server logs.` }];
    }
  }
  return moduleHealth(manifest, getIntegrationDetails(), extra);
}
