import { describe, expect, it } from "vitest";

import {
  checkAccentContrast,
  contrastRatio,
  deriveShades,
  hexToOklch,
  oklchToHex,
  readableForeground,
} from "./color";

describe("OKLCH conversion", () => {
  it.each(["#ed573d", "#0a102a", "#ffffff", "#000000", "#5f6471", "#3b82f6", "#16a34a"])(
    "round-trips %s",
    (hex) => {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    },
  );

  it("gives white L=1 and black L=0", () => {
    expect(hexToOklch("#ffffff").l).toBeCloseTo(1, 3);
    expect(hexToOklch("#000000").l).toBeCloseTo(0, 3);
  });

  it("clamps out-of-gamut colors into sRGB", () => {
    expect(oklchToHex({ l: 0.7, c: 0.5, h: 30 })).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("deriveShades", () => {
  it("darkens light and mid colors for hover and active", () => {
    const base = hexToOklch("#ed573d").l;
    const { hover, active } = deriveShades("#ed573d");
    expect(hexToOklch(hover).l).toBeCloseTo(base - 0.06, 2);
    expect(hexToOklch(active).l).toBeCloseTo(base - 0.1, 2);
  });

  it("lightens very dark colors so hover stays visible", () => {
    const base = hexToOklch("#0a102a").l;
    const { hover, active } = deriveShades("#0a102a");
    expect(hexToOklch(hover).l).toBeGreaterThan(base);
    expect(hexToOklch(active).l).toBeGreaterThan(hexToOklch(hover).l);
  });
});

describe("contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("reports AA and AA-large for the North / Co accent", () => {
    const result = checkAccentContrast("#ed573d");
    expect(result.whiteOnAccent.ratio).toBeCloseTo(3.48, 1);
    expect(result.whiteOnAccent.aa).toBe(false);
    expect(result.whiteOnAccent.aaLarge).toBe(true);
    expect(result.accentOnPage.ratio).toBe(result.whiteOnAccent.ratio);
  });

  it("passes AA for a dark accent", () => {
    expect(checkAccentContrast("#1d4ed8").whiteOnAccent.aa).toBe(true);
  });
});

describe("readableForeground", () => {
  it("keeps white on the design's coral and navy", () => {
    expect(readableForeground("#ed573d")).toBe("#ffffff");
    expect(readableForeground("#0a102a")).toBe("#ffffff");
  });

  it("switches to the dark color on light fills", () => {
    expect(readableForeground("#facc15")).toBe("#121729");
    expect(readableForeground("#ffffff", "#000000")).toBe("#000000");
  });
});
