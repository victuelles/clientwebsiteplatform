import "server-only";

import { getIntegrationDetails } from "@/core/env";
import { getModule, listModules } from "@/core/modules/registry";
import { getModuleDataSummary, getModuleHealth } from "@/core/modules/registry.server";
import {
  disableBlockedMessage,
  disableBlockers,
  enableBlockedMessage,
  enableBlockers,
  INTEGRATION_LABELS,
  INTEGRATIONS_SETTINGS_HREF,
} from "@/core/modules/rules";
import type { ModuleDataCount, ModuleHealthWarning, ModuleKey } from "@/core/modules/types";
import { getSectionDefinition } from "@/core/sections/registry";
import { createClient } from "@/core/supabase/server";

export type ModuleCardData = {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  phase: number;
  enabled: boolean;
  changedAt: string | null;
  requires: { key: string; label: string; met: boolean }[];
  integrations: { key: string; label: string; met: boolean; missing: string[]; href: string }[];
  optionalIntegrations: { key: string; label: string; unlocks: string; met: boolean }[];
  worksWith: { key: string; label: string; enabled: boolean }[];
  /** Why the switch can't turn it on (null when it can). */
  enableBlocked: string | null;
  /** Why the switch can't turn it off (null when it can). */
  disableBlocked: string | null;
  health: ModuleHealthWarning[];
  /** What turning it on adds. */
  appears: {
    publicRoutes: string[];
    adminNav: string[];
    accountNav: string[];
    sectionTypes: string[];
    feeds: string[];
  };
  dataSummary: ModuleDataCount[];
  /** Menu items and sections that point to the module and will be hidden while it is off. */
  hiddenItems: string[];
  hasSettings: boolean;
};

type Json = unknown;

/** True when `value` contains a module link to `key` anywhere. */
function linksToModule(value: Json, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => linksToModule(item, key));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.kind === "module" && record.moduleKey === key) return true;
    return Object.values(record).some((item) => linksToModule(item, key));
  }
  return false;
}

type SectionLike = { type: string; props: Json };

function sectionUsesModule(section: SectionLike, key: string, feeds: string[], types: string[]) {
  if (types.includes(section.type)) return true;
  const source = (section.props as { source?: unknown } | null)?.source;
  if (section.type === "module_feed" && typeof source === "string" && feeds.includes(source))
    return true;
  return linksToModule(section.props, key);
}

export async function loadModuleCards(): Promise<ModuleCardData[]> {
  const supabase = await createClient();
  const [modulesResult, menusResult, itemsResult, pagesResult, sectionsResult] = await Promise.all([
    supabase.from("modules").select("key, enabled, enabled_at, disabled_at"),
    supabase.from("menus").select("id, key, title"),
    supabase.from("menu_items").select("menu_id, label, link"),
    supabase.from("pages").select("id, title, published_sections"),
    supabase.from("page_sections").select("page_id, type, props"),
  ]);
  if (modulesResult.error)
    throw new Error(`Could not load modules: ${modulesResult.error.message}`);

  const rows = new Map((modulesResult.data ?? []).map((row) => [row.key, row]));
  const states = Object.fromEntries((modulesResult.data ?? []).map((r) => [r.key, r.enabled]));
  const integrations = getIntegrationDetails();
  const all = listModules();
  const label = (key: string) => getModule(key)?.label ?? key;
  const menuName = (id: string) => {
    const menu = (menusResult.data ?? []).find((m) => m.id === id);
    if (!menu) return "Menu";
    return menu.key === "header" ? "Header menu" : `Footer: ${menu.title || menu.key}`;
  };

  return Promise.all(
    all.map(async (manifest) => {
      const row = rows.get(manifest.key);
      const enabled = row?.enabled === true;
      const blockers = enableBlockers(manifest, states, integrations, label);
      const dependents = disableBlockers(manifest.key, all, states);
      const feeds = manifest.feeds.map((f) => f.key);
      const types = manifest.sectionTypes.map((s) => s.key);

      const hiddenItems = [
        ...(itemsResult.data ?? [])
          .filter((item) => linksToModule(item.link, manifest.key))
          .map((item) => `${menuName(item.menu_id)}: ${item.label}`),
        ...(pagesResult.data ?? []).flatMap((page) => {
          const published = Array.isArray(page.published_sections)
            ? (page.published_sections as SectionLike[])
            : [];
          const draft = (sectionsResult.data ?? []).filter((s) => s.page_id === page.id);
          const used = new Set(
            [...published, ...draft]
              .filter((section) => sectionUsesModule(section, manifest.key, feeds, types))
              .map((section) => getSectionDefinition(section.type)?.label ?? section.type),
          );
          return [...used].map((section) => `${page.title} page: ${section} section`);
        }),
      ];

      const [health, dataSummary] = await Promise.all([
        getModuleHealth(manifest.key),
        getModuleDataSummary(manifest.key),
      ]);

      return {
        key: manifest.key,
        label: manifest.label,
        description: manifest.description,
        icon: manifest.icon,
        phase: manifest.phase,
        enabled,
        changedAt: (enabled ? row?.enabled_at : row?.disabled_at) ?? null,
        requires: manifest.requiresModules.map((key) => ({
          key,
          label: label(key),
          met: states[key] === true,
        })),
        integrations: manifest.requiredIntegrations.map((key) => ({
          key,
          label: INTEGRATION_LABELS[key],
          met: integrations[key].configured,
          missing: integrations[key].missing,
          href: INTEGRATIONS_SETTINGS_HREF,
        })),
        optionalIntegrations: manifest.optionalIntegrations.map((item) => ({
          key: item.key,
          label: INTEGRATION_LABELS[item.key],
          unlocks: item.unlocks,
          met: integrations[item.key].configured,
        })),
        worksWith: manifest.worksWithModules.map((key) => ({
          key,
          label: label(key),
          enabled: states[key] === true,
        })),
        enableBlocked: blockers.length ? enableBlockedMessage(manifest.label, blockers) : null,
        disableBlocked: dependents.length
          ? disableBlockedMessage(manifest.label, dependents)
          : null,
        health: enabled ? health : [],
        appears: {
          publicRoutes: [...manifest.publicRoutes],
          adminNav: manifest.adminNav.map((item) => item.label),
          accountNav: manifest.accountNav.map((item) => item.label),
          sectionTypes: manifest.sectionTypes.map((s) => s.label),
          feeds: manifest.feeds.map((f) => f.label),
        },
        dataSummary,
        hiddenItems,
        hasSettings: Boolean(manifest.settings),
      } satisfies ModuleCardData;
    }),
  );
}
