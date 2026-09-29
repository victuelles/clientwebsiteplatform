import type { Metadata } from "next";

import { requireSuperAdmin } from "@/core/access/guard";

import { AdminPageHeader } from "../_shell/page-header";
import { PhasePlaceholder } from "../_shell/placeholder";

export const metadata: Metadata = { title: "Modules" };

export default async function ModulesPage() {
  await requireSuperAdmin();
  return (
    <>
      <AdminPageHeader
        title="Modules"
        breadcrumbs={[{ label: "Modules" }]}
        description="Turn optional modules on or off for this site."
      />
      <PhasePlaceholder phase={5}>
        The module framework and on/off switches are built in Phase 5.
      </PhasePlaceholder>
    </>
  );
}
