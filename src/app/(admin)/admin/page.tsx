import { requireStaffOrAdmin } from "@/core/access/guard";
import { ROLE_LABELS } from "@/core/auth/roles";

import { HealthStatus } from "./_components/health-status";

export default async function AdminDashboardPage() {
  // Also checked here: layouts are not re-run on every client-side navigation.
  const { profile } = await requireStaffOrAdmin();

  return (
    <main className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground" data-testid="admin-identity">
        Signed in as{" "}
        <span className="font-medium text-foreground">{profile.full_name ?? profile.email}</span> ·{" "}
        {ROLE_LABELS[profile.role]}
      </p>
      <HealthStatus />
    </main>
  );
}
