import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffOrAdmin } from "@/core/access/guard";
import { ROLE_LABELS } from "@/core/auth/roles";
import { SiteIcon } from "@/core/icons/icon";

import { HealthStatus } from "./_components/health-status";
import { buildNav } from "./_shell/nav";
import { AdminPageHeader } from "./_shell/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  // Also checked here: layouts are not re-run on every client-side navigation.
  const context = await requireStaffOrAdmin();
  const { profile } = context;
  const nav = buildNav(context);
  const areas = nav
    .filter((group) => group.label !== "Modules")
    .flatMap((group) => group.items)
    .filter((item) => item.href !== "/admin");
  // Enabled modules this user can open (buildNav already filters by module state and permission).
  const modules = nav.find((group) => group.label === "Modules")?.items ?? [];

  return (
    <>
      <AdminPageHeader
        title={`Welcome, ${profile.full_name ?? profile.email}`}
        breadcrumbs={[{ label: "Dashboard" }]}
        description={
          <span className="flex flex-wrap items-center gap-2" data-testid="admin-identity">
            You are signed in as
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
          </span>
        }
      />

      <section aria-labelledby="areas-heading" className="space-y-3">
        <h2 id="areas-heading" className="text-lg font-semibold">
          Your areas
        </h2>
        {areas.length === 0 ? (
          <p className="text-muted-foreground">
            You don&apos;t have access to any areas yet. Ask the site owner to grant you
            permissions.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-areas">
            {areas.map((area) => (
              <li key={area.href}>
                <Link href={area.href} className="group block h-full">
                  <Card className="h-full ring-border transition-shadow group-hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="group-hover:text-accent">{area.title}</CardTitle>
                      <CardDescription>{area.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modules.length > 0 && (
        <section aria-labelledby="modules-heading" className="space-y-3">
          <h2 id="modules-heading" className="text-lg font-semibold">
            Modules
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-modules">
            {modules.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group block h-full">
                  <Card className="h-full ring-border transition-shadow group-hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <SiteIcon name={item.moduleIcon} className="size-5 text-accent" />
                      <CardTitle className="group-hover:text-accent">{item.title}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="health-heading" className="space-y-3">
        <h2 id="health-heading" className="text-lg font-semibold">
          Site health
        </h2>
        <Card className="ring-border">
          <CardContent>
            <HealthStatus />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
