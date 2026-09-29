import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/core/access/guard";
import { getModule } from "@/core/modules/registry";

import { AccountPlaceholder } from "../_components/account-placeholder";

export const metadata: Metadata = { title: "My listings" };

export default async function Page() {
  const { modules } = await requireUser();
  if (!modules.directory) notFound();
  const manifest = getModule("directory")!;
  return <AccountPlaceholder title="My listings" manifest={manifest} />;
}
