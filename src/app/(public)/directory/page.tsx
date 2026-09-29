import type { Metadata } from "next";

import { ModuleComingSoon } from "@/components/site/module-coming-soon";
import { requireModulePublic } from "@/core/modules/guard";

export const metadata: Metadata = { title: "Directory" };

// Placeholder until the module's phase builds it.
export default async function Page() {
  const manifest = await requireModulePublic("directory");
  return <ModuleComingSoon manifest={manifest} title="Directory" />;
}
