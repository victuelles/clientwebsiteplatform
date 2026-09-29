import { defineModule } from "@/core/modules/types";

// Email marketing (built in Phase 10). See CLAUDE.md, "How to build a module".
export const emailMarketingModule = defineModule({
  key: "email_marketing",
  label: "Email marketing",
  description: "Newsletters and campaigns sent to CRM contacts through Resend.",
  icon: "mail",
  phase: 10,
  actions: ["view", "create", "edit", "delete", "publish"],
  publicRoutes: [],
  adminNav: [
    { label: "Email marketing", href: "/admin/m/email_marketing", icon: "mail", action: "view" },
  ],
  accountNav: [],
  sectionTypes: [],
  feeds: [],
  requiresModules: ["crm"],
  worksWithModules: [],
  requiredIntegrations: ["resend"],
  optionalIntegrations: [],
});
