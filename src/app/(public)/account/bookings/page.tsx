import type { Metadata } from "next";

import { requireUser } from "@/core/access/guard";
import { requireModulePublic } from "@/core/modules/guard";

import { AccountPlaceholder } from "../_components/account-placeholder";

export const metadata: Metadata = { title: "My bookings" };

export default async function Page() {
  await requireUser();
  const manifest = await requireModulePublic("booking");
  return <AccountPlaceholder title="My bookings" manifest={manifest} />;
}
