import { defineModule } from "@/core/modules/types";

// Business directory (built in Phase 14). See CLAUDE.md, "How to build a module".
export const directoryModule = defineModule({
  key: "directory",
  label: "Business directory",
  description:
    "A searchable directory of businesses; members can submit and manage their listings.",
  icon: "map-pin",
  phase: 14,
  actions: ["view", "create", "edit", "delete"],
  publicRoutes: ["/directory"],
  adminNav: [{ label: "Directory", href: "/admin/m/directory", icon: "map-pin", action: "view" }],
  accountNav: [{ label: "My listings", href: "/account/listings" }],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: [],
  optionalIntegrations: [],
});
