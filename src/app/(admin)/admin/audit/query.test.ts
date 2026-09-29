import { describe, expect, it } from "vitest";

import { auditHref, nextDay, parseAuditFilters } from "./query";

describe("audit filters", () => {
  it("parses valid params and ignores invalid ones", () => {
    expect(
      parseAuditFilters({
        page: "3",
        actor: "00000000-0000-4000-8000-000000000001",
        scope: "users",
        from: "2026-09-01",
        to: "not-a-date",
      }),
    ).toEqual({
      page: 3,
      actor: "00000000-0000-4000-8000-000000000001",
      scope: "users",
      from: "2026-09-01",
      to: undefined,
    });
    expect(parseAuditFilters({ page: "-2", actor: "x", scope: "nope" })).toEqual({
      page: 1,
      actor: undefined,
      scope: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("builds links that keep filters", () => {
    expect(auditHref({ page: 1 })).toBe("/admin/audit");
    expect(auditHref({ page: 2, scope: "users", from: "2026-09-01" })).toBe(
      "/admin/audit?scope=users&from=2026-09-01&page=2",
    );
  });

  it("computes an exclusive upper bound for date ranges", () => {
    expect(nextDay("2026-09-30")).toBe("2026-10-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });
});
