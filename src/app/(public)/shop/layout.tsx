import { requireModulePublic } from "@/core/modules/guard";

// Owned by the shop module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/shop">) {
  await requireModulePublic("shop");
  return children;
}
