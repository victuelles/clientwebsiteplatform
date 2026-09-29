import type { Metadata } from "next";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSuperAdmin } from "@/core/access/guard";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../_shell/page-header";
import { InviteStaffDialog } from "./_components/invite-staff-dialog";
import { StaffStatusBadge } from "./_components/status-badge";
import { formatDateTime, staffStatus } from "./status";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_staff");
  if (error) throw new Error(`Could not load staff: ${error.message}`);
  const staff = data ?? [];

  return (
    <>
      <AdminPageHeader
        title="Staff"
        breadcrumbs={[{ label: "Staff" }]}
        description="Invite staff members and choose what each of them can do."
        actions={<InviteStaffDialog />}
      />

      {staff.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center text-muted-foreground">
          No staff yet. Invite someone to get started.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Permissions</TableHead>
                <TableHead>Last sign-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/staff/${member.id}`}
                      className="underline-offset-4 hover:text-accent hover:underline"
                    >
                      {member.full_name ?? member.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <StaffStatusBadge status={staffStatus(member)} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {member.permission_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(member.last_sign_in_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
