import type { Metadata } from "next";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { requireSuperAdmin } from "@/core/access/guard";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../_shell/page-header";
import { AuditFilters } from "./_components/audit-filters";
import { AuditTable, type AuditRow } from "./_components/audit-table";
import { AUDIT_PAGE_SIZE, auditHref, nextDay, parseAuditFilters } from "./query";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage(props: PageProps<"/admin/audit">) {
  await requireSuperAdmin();
  const filters = parseAuditFilters(await props.searchParams);
  const supabase = await createClient();

  // Server-side pagination: only the requested page is fetched.
  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_id, action, scope, target_table, target_id, metadata", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (filters.actor) query = query.eq("actor_id", filters.actor);
  if (filters.scope) query = query.eq("scope", filters.scope);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lt("created_at", `${nextDay(filters.to)}T00:00:00Z`);

  const offset = (filters.page - 1) * AUDIT_PAGE_SIZE;
  const [{ data: entries, count, error }, { data: admins }] = await Promise.all([
    query.range(offset, offset + AUDIT_PAGE_SIZE - 1),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("role", ["super_admin", "staff"])
      .order("full_name"),
  ]);
  if (error) throw new Error(`Could not load the audit log: ${error.message}`);

  // Names for actors and profile targets on this page (audit_log has no FK, by design).
  const ids = new Set<string>();
  for (const entry of entries ?? []) {
    if (entry.actor_id) ids.add(entry.actor_id);
    if (entry.target_table === "profiles" && entry.target_id) ids.add(entry.target_id);
  }
  if (filters.actor) ids.add(filters.actor);
  const { data: people } = ids.size
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...ids])
    : { data: [] };
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name ?? p.email]));

  const rows: AuditRow[] = (entries ?? []).map((entry) => ({
    id: entry.id,
    createdAt: entry.created_at,
    actorName: entry.actor_id ? (nameOf.get(entry.actor_id) ?? "Deleted user") : "System",
    action: entry.action,
    scope: entry.scope,
    targetTable: entry.target_table,
    targetId: entry.target_id,
    targetLabel:
      entry.target_table === "profiles" && entry.target_id
        ? (nameOf.get(entry.target_id) ?? null)
        : null,
    metadata: entry.metadata,
  }));

  const actorOptions = new Map((admins ?? []).map((p) => [p.id, p.full_name ?? p.email]));
  if (filters.actor && !actorOptions.has(filters.actor)) {
    actorOptions.set(filters.actor, nameOf.get(filters.actor) ?? "Unknown user");
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = Math.min(offset + AUDIT_PAGE_SIZE, total);

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        breadcrumbs={[{ label: "Audit log" }]}
        description="Every privileged change: roles, permissions, modules, and invitations. Dates are in UTC."
      />
      <AuditFilters
        filters={filters}
        actors={[...actorOptions].map(([value, label]) => ({ value, label }))}
      />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center text-muted-foreground">
          No audit entries match these filters.
        </div>
      ) : (
        <AuditTable rows={rows} />
      )}

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground" data-testid="audit-range">
          {total === 0 ? "No entries" : `Showing ${firstShown}–${lastShown} of ${total}`}
        </p>
        {pages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={auditHref({ ...filters, page: filters.page - 1 })}
                  aria-disabled={filters.page <= 1}
                  className={filters.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm tabular-nums">
                  Page {filters.page} of {pages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={auditHref({ ...filters, page: filters.page + 1 })}
                  aria-disabled={filters.page >= pages}
                  className={filters.page >= pages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
}
