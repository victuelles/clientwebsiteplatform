import type { Metadata } from "next";

import { requireAccess } from "@/core/access/guard";

import { AdminPageHeader } from "../_shell/page-header";
import { PhasePlaceholder } from "../_shell/placeholder";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  await requireAccess({ scope: "content", action: "view" });
  return (
    <>
      <AdminPageHeader
        title="Content"
        breadcrumbs={[{ label: "Content" }]}
        description="Homepage sections and pages."
      />
      <PhasePlaceholder phase={4}>
        The homepage section builder and page editor are built in Phase 4.
      </PhasePlaceholder>
    </>
  );
}
