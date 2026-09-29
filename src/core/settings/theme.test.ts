import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, parseTheme, themeSchema, themeToCssVariables } from "./theme";

describe("theme schema", () => {
  it("accepts the default theme", () => {
    expect(themeSchema.parse(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  it("normalises hex colors to lowercase", () => {
    const parsed = themeSchema.parse({
      ...DEFAULT_THEME,
      colors: { ...DEFAULT_THEME.colors, accent: " #ED573D " },
    });
    expect(parsed.colors.accent).toBe("#ed573d");
  });

  it.each([
    ["a short hex color", { colors: { ...DEFAULT_THEME.colors, accent: "#fff" } }],
    [
      "a CSS injection attempt",
      { colors: { ...DEFAULT_THEME.colors, navy: "red; } body { display:none" } },
    ],
    ["an unknown font", { fonts: { heading: "comic_sans", body: "inter" } }],
    ["a negative radius", { radius: -1 }],
    ["a future version", { version: 2 }],
  ])("rejects %s", (_name, override) => {
    expect(themeSchema.safeParse({ ...DEFAULT_THEME, ...override }).success).toBe(false);
  });

  it("falls back to the default theme for invalid stored values", () => {
    expect(parseTheme({})).toEqual(DEFAULT_THEME);
    expect(parseTheme(null)).toEqual(DEFAULT_THEME);
  });
});

describe("themeToCssVariables", () => {
  it("emits every permanent token plus derived shades and fonts", () => {
    const vars = themeToCssVariables(DEFAULT_THEME);
    expect(vars).toMatchObject({
      "--accent": "#ed573d",
      "--accent-foreground": "#ffffff",
      "--navy": "#0a102a",
      "--navy-foreground": "#ffffff",
      "--background": "#ffffff",
      "--muted": "#fafafa",
      "--border": "#e9eaed",
      "--radius": "0.125rem",
      "--font-body": "var(--font-inter)",
      "--font-heading-family": "var(--font-inter)",
    });
    expect(vars["--accent-hover"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars["--navy-active"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("maps font keys to next/font variables", () => {
    const vars = themeToCssVariables({
      ...DEFAULT_THEME,
      fonts: { heading: "playfair_display", body: "dm_sans" },
    });
    expect(vars["--font-heading-family"]).toBe("var(--font-playfair-display)");
    expect(vars["--font-body"]).toBe("var(--font-dm-sans)");
  });
});
