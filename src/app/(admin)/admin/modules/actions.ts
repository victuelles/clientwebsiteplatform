"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { ActionError, protectedAction, toActionError } from "@/core/access/protected-action";
import { getIntegrationDetails } from "@/core/env";
import { getModule, listModules } from "@/core/modules/registry";
import {
  disableBlockedMessage,
  disableBlockers,
  enableBlockedMessage,
  enableBlockers,
} from "@/core/modules/rules";
import { MODULES_TAG } from "@/core/modules/tags";
import { MENUS_TAG, PAGES_TAG } from "@/core/pages/tags";
import type { Json } from "@/core/supabase/database.types";

const moduleKey = z.string().refine((key) => Boolean(getModule(key)), "Unknown module.");

/** Everything public that depends on module state: menus, every page, and the module list. */
function expireModuleState() {
  updateTag(MODULES_TAG);
  updateTag(MENUS_TAG);
  updateTag(PAGES_TAG);
  // Admin nav, account nav, and module pages are rendered per request from the layout.
  revalidatePath("/", "layout");
}

/**
 * Turns a module on or off. The app checks integrations (keys live in env vars) and
 * dependencies for a readable message; set_module_enabled enforces dependencies again and
 * writes the audit entry.
 */
export const setModuleEnabled = protectedAction({
  role: "super_admin",
  schema: z.object({ key: moduleKey, enabled: z.boolean() }),
  handler: async ({ input, supabase }) => {
    const manifest = getModule(input.key)!;
    const { data: rows, error: readError } = await supabase.from("modules").select("key, enabled");
    if (readError) throw toActionError(readError);
    const states = Object.fromEntries((rows ?? []).map((row) => [row.key, row.enabled]));

    if (input.enabled) {
      const blockers = enableBlockers(
        manifest,
        states,
        getIntegrationDetails(),
        (key) => getModule(key)?.label ?? key,
      );
      if (blockers.length) throw new ActionError(enableBlockedMessage(manifest.label, blockers));
    } else {
      const dependents = disableBlockers(manifest.key, listModules(), states);
      if (dependents.length)
        throw new ActionError(disableBlockedMessage(manifest.label, dependents));
    }

    const { error } = await supabase.rpc("set_module_enabled", {
      module_key: input.key,
      enabled: input.enabled,
    });
    if (error) throw toActionError(error);
    expireModuleState();
    return { key: input.key, enabled: input.enabled };
  },
});

/** Saves a module's settings after validating them with the manifest's schema. */
export const saveModuleSettings = protectedAction({
  role: "super_admin",
  schema: z.object({ key: moduleKey, settings: z.record(z.string(), z.unknown()) }),
  handler: async ({ input, supabase }) => {
    const definition = getModule(input.key)!.settings;
    if (!definition) throw new ActionError("This module has no settings.");
    const parsed = definition.schema.safeParse(input.settings);
    if (!parsed.success) throw new ActionError("Check the highlighted settings.");
    const { error } = await supabase.rpc("update_module_settings", {
      module_key: input.key,
      settings: parsed.data as Json,
    });
    if (error) throw toActionError(error);
    updateTag(MODULES_TAG);
    revalidatePath(`/admin/modules/${input.key}/settings`);
    return { settings: parsed.data };
  },
});
