import { requireModulePublic } from "@/core/modules/guard";

// Owned by the video_gallery module: the site's 404 while the module is off.
export default async function Layout({ children }: LayoutProps<"/videos">) {
  await requireModulePublic("video_gallery");
  return children;
}
