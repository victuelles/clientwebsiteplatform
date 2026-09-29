import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffOrAdmin } from "@/core/access/guard";
import { ROLE_LABELS } from "@/core/auth/roles";

import { HealthStatus } from "./_components/health-status";
import { buildNav } from "./_shell/nav";
import { AdminPageHeader } from "./_shell/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  // Also checked here: layouts are not re-run on every client-side navigation.
  const context = await requireStaffOrAdmin();
  const { profile } = context;
  const areas = buildNav(context)
    .flatMap((group) => group.items)
    .filter((item) => item.href !== "/admin");

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
