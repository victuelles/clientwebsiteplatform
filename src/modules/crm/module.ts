import { defineModule } from "@/core/modules/types";

// CRM (built in Phase 9). See CLAUDE.md, "How to build a module".
export const crmModule = defineModule({
  key: "crm",
  label: "CRM",
  description: "Contacts, companies, and notes, including contact form submissions.",
  icon: "users",
  phase: 9,
  actions: ["view", "create", "edit", "delete"],
  publicRoutes: [],
  adminNav: [{ label: "CRM", href: "/admin/m/crm", icon: "users", action: "view" }],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: [],
  optionalIntegrations: [],
});
