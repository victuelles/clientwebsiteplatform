import { defineModule } from "@/core/modules/types";

// Shop (built in Phase 11). See CLAUDE.md, "How to build a module".
export const shopModule = defineModule({
  key: "shop",
  label: "Shop",
  description: "Sell products online with a cart, Stripe checkout, and order history.",
  icon: "shopping-bag",
  phase: 11,
  actions: ["view", "create", "edit", "delete", "publish"],
  publicRoutes: ["/shop", "/cart", "/checkout"],
  adminNav: [{ label: "Shop", href: "/admin/m/shop", icon: "shopping-bag", action: "view" }],
  accountNav: [{ label: "My orders", href: "/account/orders" }],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: ["inventory", "crm"],
  requiredIntegrations: ["stripe"],
  optionalIntegrations: [{ key: "resend", unlocks: "Order confirmation emails" }],
});
