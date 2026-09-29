import type { AccessContext } from "@/core/access/context";
import type { AccessRequirement } from "@/core/access/decide";
import { SCOPES } from "@/core/access/scopes";

export type NavIcon =
  "dashboard" | "content" | "media" | "module" | "modules" | "staff" | "settings" | "audit";

export type NavItem = { title: string; href: string; icon: NavIcon; description: string };
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
    // One item per module; shown only when the module is enabled and the user has 'view'.
    items: SCOPES.filter((scope) => scope.kind === "module").map((scope) => ({
      title: scope.label,
      href: `/admin/${scope.key.replaceAll("_", "-")}`,
      icon: "module" as const,
      description: scope.label,
      requires: { scope: scope.key, action: "view" as const },
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
