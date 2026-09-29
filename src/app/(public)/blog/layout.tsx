import { requireModulePublic } from "@/core/modules/guard";

// Owned by the blog module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/blog">) {
  await requireModulePublic("blog");
  return children;
}
