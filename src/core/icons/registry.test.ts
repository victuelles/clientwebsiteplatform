import { describe, expect, it } from "vitest";

import { ICON_KEYS, ICONS, isIconKey } from "./registry";

describe("icon registry", () => {
  it("offers a curated set of about 60+ icons with labels", () => {
    expect(ICON_KEYS.length).toBeGreaterThanOrEqual(60);
    for (const key of ICON_KEYS) {
      expect(ICONS[key].label.length).toBeGreaterThan(0);
      expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("includes every icon used in docs/design", () => {
    for (const key of [
      "chart-growth",
      "landmark",
      "megaphone",
      "users",
      "shield-check",
      "sparkles",
      "target",
      "handshake",
      "lightbulb",
      "trending-up",
    ]) {
      expect(isIconKey(key)).toBe(true);
    }
  });

  it("rejects unknown keys", () => {
    expect(isIconKey("not-an-icon")).toBe(false);
    expect(isIconKey(undefined)).toBe(false);
  });
});
