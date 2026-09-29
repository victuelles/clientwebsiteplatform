import { defineModule } from "@/core/modules/types";

// Video gallery (built in Phase 8). See CLAUDE.md, "How to build a module".
export const videoGalleryModule = defineModule({
  key: "video_gallery",
  label: "Video gallery",
  description: "Videos hosted and streamed through Mux, grouped into collections.",
  icon: "video",
  phase: 8,
  actions: ["view", "create", "edit", "delete", "publish"],
  publicRoutes: ["/videos"],
  adminNav: [
    { label: "Video gallery", href: "/admin/m/video_gallery", icon: "video", action: "view" },
  ],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: ["mux"],
  optionalIntegrations: [],
});
