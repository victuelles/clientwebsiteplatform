import { feedSources, getModule } from "@/core/modules/registry";

import type { SectionDefinition } from "./types";

type Modules = Readonly<Record<string, boolean>>;

/**
 * Why a section type is unavailable right now (its module, or every feed module, is off), or
 * null when it is available. Unavailable types are hidden in "Add section", skipped on the public
 * site, and flagged in the editor.
 */
export function sectionUnavailableReason(
  definition: Pick<SectionDefinition, "requiresModule" | "requiresFeedModule">,
  modules: Modules,
): string | null {
  if (definition.requiresModule && !modules[definition.requiresModule]) {
    const label = getModule(definition.requiresModule)?.label ?? definition.requiresModule;
    return `The ${label} module is turned off, so visitors don't see this section.`;
  }
  if (definition.requiresFeedModule && !feedSources().some((feed) => modules[feed.moduleKey])) {
    return "No module that provides a feed is turned on, so visitors don't see this section.";
  }
  return null;
}

export function isSectionAvailable(
  definition: Pick<SectionDefinition, "requiresModule" | "requiresFeedModule">,
  modules: Modules,
): boolean {
  return sectionUnavailableReason(definition, modules) === null;
}
