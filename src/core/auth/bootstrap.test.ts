import { describe, expect, it } from "vitest";

import { shouldBootstrapSuperAdmin } from "./bootstrap";

const base = {
  configuredEmail: "Owner@Example.com",
  userEmail: "owner@example.com",
  emailConfirmed: true,
  superAdminExists: false,
};

describe("shouldBootstrapSuperAdmin", () => {
  it("promotes the confirmed configured email when no super admin exists", () => {
    expect(shouldBootstrapSuperAdmin(base)).toBe(true);
  });

  it("matches emails case-insensitively and ignores surrounding whitespace", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, userEmail: "  OWNER@example.COM " })).toBe(true);
  });

  it("does nothing when SUPER_ADMIN_EMAIL is not set", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, configuredEmail: undefined })).toBe(false);
    expect(shouldBootstrapSuperAdmin({ ...base, configuredEmail: "" })).toBe(false);
  });

  it("does nothing for a different email", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, userEmail: "someone@example.com" })).toBe(false);
  });

  it("does nothing for an unconfirmed email", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, emailConfirmed: false })).toBe(false);
  });

  it("does nothing once a super admin exists", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, superAdminExists: true })).toBe(false);
  });

  it("does nothing when the user has no email", () => {
    expect(shouldBootstrapSuperAdmin({ ...base, userEmail: null })).toBe(false);
  });
});
