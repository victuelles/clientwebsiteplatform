import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ModuleDisabledNotice } from "@/components/shared/module-disabled-notice";
import { ModuleHealthWarnings } from "@/components/shared/module-health-warnings";
import { Button } from "@/components/ui/button";
import { requireAccess } from "@/core/access/guard";
import { getModule, isModuleKey } from "@/core/modules/registry";
import { getModuleHealth } from "@/core/modules/registry.server";

import { AdminPageHeader } from "../../_shell/page-header";
import { PhasePlaceholder } from "../../_shell/placeholder";

// Placeholder admin page for every module. A module's phase replaces it with its own
// src/app/(admin)/admin/m/<key>/ route, which takes precedence over this dynamic one.

export async function generateMetadata(props: PageProps<"/admin/m/[key]">): Promise<Metadata> {
  const { key } = await props.params;
  return { title: getModule(key)?.label ?? "Module" };
}

export default async function ModulePlaceholderPage(props: PageProps<"/admin/m/[key]">) {
  const { key } = await props.params;
  if (!isModuleKey(key)) notFound();
  const { context, moduleDisabled } = await requireAccess({ scope: key, action: "view" });
  const manifest = getModule(key)!;
  const health = await getModuleHealth(key);
  const superAdmin = context.profile.role === "super_admin";

  return (
    <>
      <AdminPageHeader
        title={manifest.label}
        breadcrumbs={[{ label: manifest.label }]}
        description={manifest.description}
        actions={
          superAdmin && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/admin/modules/${key}/settings`} />}
            >
              Module settings
            </Button>
          )
        }
      />
      {moduleDisabled && <ModuleDisabledNotice scope={key} />}
      <ModuleHealthWarnings warnings={health} />
      <PhasePlaceholder phase={manifest.phase}>
        The {manifest.label.toLowerCase()} admin pages are built in Phase {manifest.phase}.
      </PhasePlaceholder>
    </>
  );
}
