import { requireModulePublic } from "@/core/modules/guard";

// Owned by the directory module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/directory">) {
  await requireModulePublic("directory");
  return children;
}
