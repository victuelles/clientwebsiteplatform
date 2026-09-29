import { describe, expect, it } from "vitest";

import { safeNextPath, signInPath } from "./redirects";

describe("safeNextPath", () => {
  it.each([
    ["/account", "/account"],
    ["/admin?tab=users#top", "/admin?tab=users#top"],
    ["/a/../b", "/b"],
  ])("allows internal path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["\\\\evil.com"],
    ["javascript:alert(1)"],
    ["evil.com"],
    [""],
    ["/foo\nbar"],
    ["/\t/evil.com"],
  ])("rejects %j", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(["/account"])).toBeNull();
  });
});

describe("signInPath", () => {
  it("keeps a safe next path and drops an unsafe one", () => {
    expect(signInPath("/admin")).toBe("/sign-in?next=%2Fadmin");
    expect(signInPath("//evil.com")).toBe("/sign-in");
    expect(signInPath(null, "account_disabled")).toBe("/sign-in?error=account_disabled");
  });
});
