import { describe, expect, it } from "vitest";

import { RESERVED_SLUGS, slugify, slugProblem } from "./reserved-slugs";

describe("slug validation", () => {
  it.each(["about", "our-team", "services-2026", "a"])("accepts %s", (slug) => {
    expect(slugProblem(slug)).toBeNull();
  });

  it.each([
    ["", "Enter a URL slug."],
    ["About", "lowercase"],
    ["our team", "lowercase"],
    ["our--team", "lowercase"],
    ["-team", "lowercase"],
    ["team-", "lowercase"],
    ["x".repeat(81), "at most 80"],
  ])("rejects %j", (slug, message) => {
    expect(slugProblem(slug)).toContain(message);
  });

  it.each([
    "admin",
    "api",
    "auth",
    "preview",
    "sign-in",
    "sign-up",
    "account",
    "forgot-password",
    "reset-password",
    "not-authorized",
    "blog",
    "gallery",
    "videos",
    "shop",
    "cart",
    "checkout",
    "orders",
    "directory",
    "booking",
    "bookings",
  ])("reserves %s", (slug) => {
    expect(RESERVED_SLUGS.has(slug)).toBe(true);
    expect(slugProblem(slug)).toContain("reserved");
  });
});

describe("slugify", () => {
  it.each([
    ["About Us", "about-us"],
    ["Our Team & Values!", "our-team-and-values"],
    ["  Café Menü  ", "cafe-menu"],
    ["2026 Report", "2026-report"],
    ["!!!", "page"],
  ])("%j -> %j", (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });
});
