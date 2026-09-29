export type StaffStatus = "active" | "inactive" | "invited";

export function staffStatus(row: {
  is_active: boolean;
  invited_at: string | null;
  email_confirmed_at: string | null;
}): StaffStatus {
  if (!row.is_active) return "inactive";
  if (row.invited_at && !row.email_confirmed_at) return "invited";
  return "active";
}

export const STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
};

export function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
