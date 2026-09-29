// The curated font list. next/font must know every font at build time, so the theme can only
// pick from these keys. To add a font:
//   1. Import it from "next/font/google" in src/core/settings/font-loaders.ts, give it
//      `variable: "--font-<key>"`, and add it to FONT_LOADERS there.
//   2. Add an entry here (key, label, category).
//   3. Nothing else: the theme schema, the settings selects, and the layout pick it up.

export const FONTS = [
  { key: "inter", label: "Inter", category: "sans-serif" },
  { key: "dm_sans", label: "DM Sans", category: "sans-serif" },
  { key: "manrope", label: "Manrope", category: "sans-serif" },
  { key: "plus_jakarta_sans", label: "Plus Jakarta Sans", category: "sans-serif" },
  { key: "lora", label: "Lora", category: "serif" },
  { key: "playfair_display", label: "Playfair Display", category: "serif" },
] as const;

export type FontKey = (typeof FONTS)[number]["key"];

export const FONT_KEYS = FONTS.map((font) => font.key) as [FontKey, ...FontKey[]];

/** CSS variable holding the next/font family for a key, e.g. var(--font-inter). */
export function fontVariable(key: FontKey): string {
  return `var(--font-${key.replaceAll("_", "-")})`;
}
