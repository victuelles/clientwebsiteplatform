import {
  DM_Sans,
  Inter,
  Lora,
  Manrope,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";

import type { FontKey } from "./fonts";

// Every font the theme can choose (see fonts.ts for how to add one). Only Inter (the default)
// is preloaded; the others download only when a theme uses them.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  preload: false,
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
  preload: false,
});

export const FONT_LOADERS: Record<FontKey, { variable: string }> = {
  inter,
  dm_sans: dmSans,
  manrope,
  plus_jakarta_sans: plusJakartaSans,
  lora,
  playfair_display: playfairDisplay,
};

/** Class names that define every font's CSS variable (put on <html>). */
export const fontVariableClassNames = Object.values(FONT_LOADERS)
  .map((font) => font.variable)
  .join(" ");
