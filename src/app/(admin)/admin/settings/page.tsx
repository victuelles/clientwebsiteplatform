import type { Metadata } from "next";

import { requireSuperAdmin } from "@/core/access/guard";

import { AdminPageHeader } from "../_shell/page-header";
import { PhasePlaceholder } from "../_shell/placeholder";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSuperAdmin();
  return (
    <>
      <AdminPageHeader
        title="Settings"
        breadcrumbs={[{ label: "Settings" }]}
        description="Site name, contact details, and branding."
      />
      <PhasePlaceholder phase={3}>
        Branding and site settings are built in Phase 3.
      </PhasePlaceholder>
    </>
  );
}
