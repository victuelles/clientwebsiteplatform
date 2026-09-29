import { defineModule } from "@/core/modules/types";

// Inventory (built in Phase 12). See CLAUDE.md, "How to build a module".
export const inventoryModule = defineModule({
  key: "inventory",
  label: "Inventory",
  description: "Track stock levels, locations, and adjustments.",
  icon: "package",
  phase: 12,
  actions: ["view", "create", "edit", "delete"],
  publicRoutes: [],
  adminNav: [{ label: "Inventory", href: "/admin/m/inventory", icon: "package", action: "view" }],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: ["shop"],
  requiredIntegrations: [],
  optionalIntegrations: [],
});
