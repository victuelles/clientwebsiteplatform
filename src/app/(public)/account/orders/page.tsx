import type { Metadata } from "next";

import { requireUser } from "@/core/access/guard";
import { requireModulePublic } from "@/core/modules/guard";

import { AccountPlaceholder } from "../_components/account-placeholder";

export const metadata: Metadata = { title: "My orders" };

export default async function Page() {
  await requireUser();
  const manifest = await requireModulePublic("shop");
  return <AccountPlaceholder title="My orders" manifest={manifest} />;
}
