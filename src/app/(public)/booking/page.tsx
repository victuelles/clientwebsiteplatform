import type { Metadata } from "next";

import { ModuleComingSoon } from "@/components/site/module-coming-soon";
import { requireModulePublic } from "@/core/modules/guard";

export const metadata: Metadata = { title: "Booking" };

// Placeholder until the module's phase builds it.
export default async function Page() {
  const manifest = await requireModulePublic("booking");
  return <ModuleComingSoon manifest={manifest} title="Booking" />;
}
