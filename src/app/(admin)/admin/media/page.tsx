import type { Metadata } from "next";

import { requireAccess } from "@/core/access/guard";

import { AdminPageHeader } from "../_shell/page-header";
import { PhasePlaceholder } from "../_shell/placeholder";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  await requireAccess({ scope: "media", action: "view" });
  return (
    <>
      <AdminPageHeader
        title="Media"
        breadcrumbs={[{ label: "Media" }]}
        description="Images and files used across the site."
      />
      <PhasePlaceholder phase={3}>The media library is built in Phase 3.</PhasePlaceholder>
    </>
  );
}
