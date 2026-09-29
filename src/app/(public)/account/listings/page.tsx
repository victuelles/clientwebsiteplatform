import type { Metadata } from "next";

import { requireUser } from "@/core/access/guard";
import { requireModulePublic } from "@/core/modules/guard";

import { AccountPlaceholder } from "../_components/account-placeholder";

export const metadata: Metadata = { title: "My listings" };

export default async function Page() {
  await requireUser();
  const manifest = await requireModulePublic("directory");
  return <AccountPlaceholder title="My listings" manifest={manifest} />;
}
