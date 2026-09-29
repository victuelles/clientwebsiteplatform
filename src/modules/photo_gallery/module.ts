import { defineModule } from "@/core/modules/types";

// Photo gallery (built in Phase 7). See CLAUDE.md, "How to build a module".
export const photoGalleryModule = defineModule({
  key: "photo_gallery",
  label: "Photo gallery",
  description: "Photo albums with captions, shown in a responsive gallery.",
  icon: "camera",
  phase: 7,
  actions: ["view", "create", "edit", "delete", "publish"],
  publicRoutes: ["/gallery"],
  adminNav: [
    { label: "Photo gallery", href: "/admin/m/photo_gallery", icon: "camera", action: "view" },
  ],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: [],
  optionalIntegrations: [],
});
