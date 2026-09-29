import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/core/access/guard";
import { getModule, isModuleKey } from "@/core/modules/registry";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../../../_shell/page-header";
import { ModuleSettingsForm } from "../../_components/module-settings-form";

export async function generateMetadata(
  props: PageProps<"/admin/modules/[key]/settings">,
): Promise<Metadata> {
  const { key } = await props.params;
  return { title: `${getModule(key)?.label ?? "Module"} settings` };
}

export default async function ModuleSettingsPage(
  props: PageProps<"/admin/modules/[key]/settings">,
) {
  await requireSuperAdmin();
  const { key } = await props.params;
  if (!isModuleKey(key)) notFound();
  const manifest = getModule(key)!;

  let initial: Record<string, unknown> = {};
  if (manifest.settings) {
    const supabase = await createClient();
    const { data } = await supabase.from("modules").select("settings").eq("key", key).single();
    // Stored values over defaults; anything invalid falls back to the defaults.
    const stored = (data?.settings ?? {}) as Record<string, unknown>;
    const parsed = manifest.settings.schema.safeParse(stored);
    initial = (parsed.success ? parsed.data : manifest.settings.schema.parse({})) as Record<
      string,
      unknown
    >;
  }

  return (
    <>
      <AdminPageHeader
        title={`${manifest.label} settings`}
        breadcrumbs={[{ label: "Modules", href: "/admin/modules" }, { label: manifest.label }]}
        description="Settings apply to this module across the site. You can change them while the module is off."
      />
      {manifest.settings ? (
        <ModuleSettingsForm moduleKey={key} fields={manifest.settings.fields} initial={initial} />
      ) : (
        <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          No settings yet.
        </p>
      )}
    </>
  );
}
