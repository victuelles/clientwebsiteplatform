import { requireModulePublic } from "@/core/modules/guard";

// Owned by the photo_gallery module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/gallery">) {
  await requireModulePublic("photo_gallery");
  return children;
}
