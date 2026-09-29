import { z } from "zod";

import { SCOPES } from "@/core/access/scopes";

export const AUDIT_PAGE_SIZE = 25;

/** Scopes an audit entry can have: permission scopes plus "users" (staff/user management). */
export const AUDIT_SCOPES = [
  { value: "users", label: "Users and staff" },
  ...SCOPES.map((scope) => ({ value: scope.key, label: scope.label })),
];

const dateSchema = z.iso.date();

export type AuditFilters = {
  page: number;
  actor?: string;
  scope?: string;
  from?: string;
  to?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses search params leniently: invalid values are ignored rather than erroring. */
export function parseAuditFilters(
  params: Record<string, string | string[] | undefined>,
): AuditFilters {
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const actor = first(params.actor);
  const scope = first(params.scope);
  const from = first(params.from);
  const to = first(params.to);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    actor: actor && z.uuid().safeParse(actor).success ? actor : undefined,
    scope: scope && AUDIT_SCOPES.some((s) => s.value === scope) ? scope : undefined,
    from: from && dateSchema.safeParse(from).success ? from : undefined,
    to: to && dateSchema.safeParse(to).success ? to : undefined,
  };
}

/** Builds a query string for the given filters (page 1 is omitted). */
export function auditHref(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.scope) params.set("scope", filters.scope);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

/** The day after a YYYY-MM-DD date, for an exclusive upper bound (dates are UTC). */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
