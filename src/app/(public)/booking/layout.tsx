import { requireModulePublic } from "@/core/modules/guard";

// Owned by the booking module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/booking">) {
  await requireModulePublic("booking");
  return children;
}
