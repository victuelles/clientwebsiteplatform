import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSuperAdmin } from "@/core/access/guard";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../../_shell/page-header";
import { PermissionMatrix } from "../_components/permission-matrix";
import { StaffActions } from "../_components/staff-actions";
import { StaffStatusBadge } from "../_components/status-badge";
import { formatDateTime, staffStatus } from "../status";

export const metadata: Metadata = { title: "Staff member" };

export default async function StaffMemberPage(props: PageProps<"/admin/staff/[id]">) {
  const context = await requireSuperAdmin();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  // admin_list_staff only returns staff, so the super admin's own account is never editable here.
  const [{ data: rows, error }, { data: grants, error: grantsError }] = await Promise.all([
    supabase.rpc("admin_list_staff", { target_user: id }),
    supabase.from("staff_permissions").select("scope, action").eq("user_id", id),
  ]);
  if (error) throw new Error(`Could not load staff member: ${error.message}`);
  if (grantsError) throw new Error(`Could not load permissions: ${grantsError.message}`);

  const member = rows?.[0];
  if (!member || member.id === context.profile.id) notFound();

  const name = member.full_name ?? member.email;
  const status = staffStatus(member);

  return (
    <>
      <AdminPageHeader
        title={name}
        breadcrumbs={[{ label: "Staff", href: "/admin/staff" }, { label: name }]}
        description={member.email}
        actions={<StaffActions userId={member.id} name={name} status={status} />}
      />

      <Card className="ring-border">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1" data-testid="staff-status">
                <StaffStatusBadge status={status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Invited</dt>
              <dd className="mt-1 font-medium">{formatDateTime(member.invited_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last sign-in</dt>
              <dd className="mt-1 font-medium">{formatDateTime(member.last_sign_in_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="mt-1 font-medium">{formatDateTime(member.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="permissions-heading" className="space-y-3">
        <div>
          <h2 id="permissions-heading" className="text-lg font-semibold">
            Permissions
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose what {name} can do in each area. Module permissions only take effect while the
            module is turned on.
          </p>
        </div>
        <PermissionMatrix
          key={(grants ?? []).map((g) => `${g.scope}:${g.action}`).join(",")}
          userId={member.id}
          initial={grants ?? []}
          modules={context.modules}
        />
      </section>
    </>
  );
}
