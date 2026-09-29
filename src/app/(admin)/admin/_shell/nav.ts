import type { AccessContext } from "@/core/access/context";
import type { AccessRequirement } from "@/core/access/decide";
import type { IconKey } from "@/core/icons/registry";
import { adminNavItems } from "@/core/modules/registry";

export type NavIcon =
  | "dashboard"
  | "content"
  | "navigation"
  | "media"
  | "module"
  | "modules"
  | "staff"
  | "settings"
  | "audit";

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  /** A module's own icon (curated icon key); used instead of `icon` when set. */
  moduleIcon?: IconKey;
  description: string;
};
export type NavGroup = { label: string; items: NavItem[] };

type NavConfigItem = NavItem & { requires: AccessRequirement };

/** Admin navigation. Filtered on the server by the access context (see buildNav). */
const NAV_CONFIG: { label: string; items: NavConfigItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: "dashboard",
        description: "Overview and site health",
        requires: { role: "staff_or_admin" },
      },
    ],
  },
  {
    label: "Website",
    items: [
      {
        title: "Content",
        href: "/admin/content",
        icon: "content",
        description: "Homepage and pages",
        requires: { scope: "content", action: "view" },
      },
      {
        title: "Navigation",
        href: "/admin/content/navigation",
        icon: "navigation",
        description: "Header and footer menus",
        requires: { scope: "content", action: "view" },
      },
      {
        title: "Media",
        href: "/admin/media",
        icon: "media",
        description: "Images and files",
        requires: { scope: "media", action: "view" },
      },
    ],
  },
  {
    label: "Modules",
    // From the module registry. check() is "module_disabled" (not "allowed") while a module is
    // off, so its items disappear for everyone; the super admin reaches it from Modules.
    items: adminNavItems().map((item) => ({
      title: item.label,
      href: item.href,
      icon: "module" as const,
      moduleIcon: item.icon,
      description: item.label,
      requires: { scope: item.moduleKey, action: item.action },
    })),
  },
  {
    label: "Administration",
    items: [
      {
        title: "Modules",
        href: "/admin/modules",
        icon: "modules",
        description: "Turn optional modules on or off",
        requires: { role: "super_admin" },
      },
      {
        title: "Staff",
        href: "/admin/staff",
        icon: "staff",
        description: "Invite staff and manage permissions",
        requires: { role: "super_admin" },
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: "settings",
        description: "Site settings and branding",
        requires: { role: "super_admin" },
      },
      {
        title: "Audit log",
        href: "/admin/audit",
        icon: "audit",
        description: "Every privileged change",
        requires: { role: "super_admin" },
      },
    ],
  },
];

/** The nav groups this user may see. Hiding is convenience only; every page has its own guard. */
export function buildNav(context: AccessContext): NavGroup[] {
  return NAV_CONFIG.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => context.check(item.requires) === "allowed")
      .map(({ requires: _requires, ...item }) => item),
  })).filter((group) => group.items.length > 0);
}
