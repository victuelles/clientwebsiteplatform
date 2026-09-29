import { defineModule } from "@/core/modules/types";

// Booking (built in Phase 13). See CLAUDE.md, "How to build a module".
export const bookingModule = defineModule({
  key: "booking",
  label: "Booking",
  description: "Let visitors book appointments or services from your availability.",
  icon: "calendar",
  phase: 13,
  actions: ["view", "create", "edit", "delete"],
  publicRoutes: ["/booking"],
  adminNav: [{ label: "Booking", href: "/admin/m/booking", icon: "calendar", action: "view" }],
  accountNav: [{ label: "My bookings", href: "/account/bookings" }],
  sectionTypes: [],
  feeds: [],
  requiresModules: [],
  worksWithModules: ["crm"],
  requiredIntegrations: [],
  optionalIntegrations: [{ key: "stripe", unlocks: "Deposits and prepayment" }],
});
