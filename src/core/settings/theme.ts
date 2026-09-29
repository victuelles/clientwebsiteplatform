import { z } from "zod";

import { deriveShades, isHexColor, readableForeground } from "./color";
import { FONT_KEYS, fontVariable } from "./fonts";

// The stored theme (site_settings.theme). Bump THEME_VERSION and add a migration step in
// parseTheme() whenever the shape changes.

export const THEME_VERSION = 1;

const hexColor = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isHexColor, "Use a 6-digit hex color like #ed573d.");

export const themeSchema = z.object({
  version: z.literal(THEME_VERSION),
  colors: z.object({
    /** Coral in the North / Co design: primary buttons, eyebrows, highlights. */
    accent: hexColor,
    /** Dark sections, header, footer, dark buttons. */
    navy: hexColor,
    background: hexColor,
    foreground: hexColor,
    /** Light section background. */
    muted: hexColor,
    mutedForeground: hexColor,
    border: hexColor,
  }),
  fonts: z.object({ heading: z.enum(FONT_KEYS), body: z.enum(FONT_KEYS) }),
  /** Base corner radius in rem (0 = square, 1 = very round). */
  radius: z.number().min(0).max(1.5),
});

export type Theme = z.infer<typeof themeSchema>;

/** The North / Co theme (also seeded by migration). "Reset to defaults" restores this. */
export const DEFAULT_THEME: Theme = {
  version: 1,
  colors: {
    accent: "#ed573d",
    navy: "#0a102a",
    background: "#ffffff",
    foreground: "#121729",
    muted: "#fafafa",
    mutedForeground: "#5f6471",
    border: "#e9eaed",
  },
  fonts: { heading: "inter", body: "inter" },
  radius: 0.125,
};

/** Parses a stored theme, falling back to the default for anything missing or invalid. */
export function parseTheme(value: unknown): Theme {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

/**
 * The theme as CSS custom properties, using the permanent token names from globals.css.
 * Derived: hover/active shades and readable foregrounds for accent and navy.
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const { colors } = theme;
  const accent = deriveShades(colors.accent);
  const navy = deriveShades(colors.navy);
  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--border": colors.border,
    "--accent": colors.accent,
    "--accent-foreground": readableForeground(colors.accent, colors.foreground),
    "--accent-hover": accent.hover,
    "--accent-active": accent.active,
    "--navy": colors.navy,
    "--navy-foreground": readableForeground(colors.navy, colors.foreground),
    "--navy-hover": navy.hover,
    "--navy-active": navy.active,
    "--radius": `${theme.radius}rem`,
    "--font-body": fontVariable(theme.fonts.body),
    "--font-heading-family": fontVariable(theme.fonts.heading),
  };
}
