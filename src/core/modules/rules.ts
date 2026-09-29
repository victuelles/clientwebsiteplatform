import type { IntegrationDetails } from "@/core/env";

import type { IntegrationKey, ModuleHealthWarning, ModuleManifest } from "./types";

// Pure enable/disable and health decisions, shared by the modules screen (to explain a disabled
// switch) and the server action (which also relies on set_module_enabled in the database).

export const INTEGRATION_LABELS: Record<IntegrationKey, string> = {
  stripe: "Stripe",
  resend: "Resend",
  mux: "Mux",
};

export const INTEGRATIONS_SETTINGS_HREF = "/admin/settings?tab=integrations";

export type ModuleStates = Readonly<Record<string, boolean>>;

export type EnableBlocker =
  | { kind: "module"; key: string; label: string }
  | { kind: "integration"; key: IntegrationKey; label: string; missing: string[] };

/** Why `manifest` can't be enabled right now (empty when it can). */
export function enableBlockers(
  manifest: ModuleManifest,
  modules: ModuleStates,
  integrations: IntegrationDetails,
  labelFor: (key: string) => string = (key) => key,
): EnableBlocker[] {
  const blockers: EnableBlocker[] = [];
  for (const key of manifest.requiresModules) {
    if (!modules[key]) blockers.push({ kind: "module", key, label: labelFor(key) });
  }
  for (const key of manifest.requiredIntegrations) {
    const details = integrations[key];
    if (!details.configured)
      blockers.push({
        kind: "integration",
        key,
        label: INTEGRATION_LABELS[key],
        missing: details.missing,
      });
  }
  return blockers;
}

/** Enabled modules that require `key`, which block disabling it. */
export function disableBlockers(
  key: string,
  all: readonly ModuleManifest[],
  modules: ModuleStates,
): ModuleManifest[] {
  return all.filter(
    (m) => modules[m.key] === true && (m.requiresModules as readonly string[]).includes(key),
  );
}

/** "A", "A and B", "A, B, and C". */
export function listLabels(labels: readonly string[]): string {
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

/** Readable reason for a blocked enable. */
export function enableBlockedMessage(label: string, blockers: readonly EnableBlocker[]): string {
  const modules = blockers.filter((b) => b.kind === "module").map((b) => b.label);
  const integrations = blockers.filter((b) => b.kind === "integration").map((b) => b.label);
  const parts: string[] = [];
  if (modules.length) parts.push(`turn on ${listLabels(modules)} first`);
  if (integrations.length) parts.push(`configure ${listLabels(integrations)}`);
  return `To turn on ${label}, ${listLabels(parts)}.`;
}

/** Readable reason for a blocked disable. */
export function disableBlockedMessage(
  label: string,
  dependents: readonly ModuleManifest[],
): string {
  return `${label} can't be turned off while ${listLabels(dependents.map((m) => m.label))} ${
    dependents.length === 1 ? "is" : "are"
  } on. Turn ${dependents.length === 1 ? "it" : "them"} off first.`;
}

/**
 * Health warnings for a module: required integrations that are missing (for an enabled module
 * this means it was configured once and has since been removed) plus the module's own warnings.
 */
export function moduleHealth(
  manifest: ModuleManifest,
  integrations: IntegrationDetails,
  extra: readonly ModuleHealthWarning[] = [],
): ModuleHealthWarning[] {
  const warnings: ModuleHealthWarning[] = manifest.requiredIntegrations
    .filter((key) => !integrations[key].configured)
    .map((key) => ({
      message: `${INTEGRATION_LABELS[key]} is not configured (missing ${integrations[
        key
      ].missing.join(", ")}). ${manifest.label} needs it to work.`,
      href: INTEGRATIONS_SETTINGS_HREF,
    }));
  return [...warnings, ...extra];
}
