import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toClientAccessFacts } from "@/core/access/context";
import { requireStaffOrAdmin } from "@/core/access/guard";
import { PermissionsProvider } from "@/core/access/permissions-provider";
import { ROLE_LABELS } from "@/core/auth/roles";
import { getSiteSettings } from "@/core/settings/get-settings";

import { AdminSidebar } from "./_shell/admin-sidebar";
import { buildNav } from "./_shell/nav";

// The admin area is never indexed, even after launch.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// The admin shell. Requires active staff or the super admin; each page adds its own
// requireAccess()/requireSuperAdmin() for its scope.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const context = await requireStaffOrAdmin();
  const [{ siteName }, cookieStore] = await Promise.all([getSiteSettings(), cookies()]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const { profile } = context;

  return (
    <PermissionsProvider value={toClientAccessFacts(context)}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar
          siteName={siteName}
          nav={buildNav(context)}
          user={{
            name: profile.full_name ?? profile.email,
            email: profile.email,
            roleLabel: ROLE_LABELS[profile.role],
          }}
        />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
            <span aria-hidden className="mr-1 h-4 w-px bg-border" />
            <span className="truncate text-sm font-medium md:hidden">{siteName}</span>
          </header>
          <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProvider>
  );
}
