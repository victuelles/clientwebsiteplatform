// Small, dependency-free color math: hex <-> OKLCH (perceptual lightness for shades) and WCAG
// contrast. Pure functions, used on both server and client.

export type Oklch = { l: number; c: number; h: number };

const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX.exec(hex);
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  const n = Number.parseInt(match[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0001 && v <= 1.0001);

/** OKLCH -> hex, reducing chroma until the color fits in sRGB. */
export function oklchToHex(color: Oklch): string {
  let { c } = color;
  const l = Math.min(1, Math.max(0, color.l));
  let rgb = oklchToLinearRgb({ l, c, h: color.h });
  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    c *= 0.9;
    rgb = oklchToLinearRgb({ l, c, h: color.h });
  }
  return `#${rgb.map((v) => fromLinear(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Hover and active shades: darker for light/mid colors, lighter for very dark ones. */
export function deriveShades(hex: string): { hover: string; active: string } {
  const color = hexToOklch(hex);
  const direction = color.l > 0.35 ? -1 : 1;
  return {
    hover: oklchToHex({ ...color, l: color.l + direction * 0.06 }),
    active: oklchToHex({ ...color, l: color.l + direction * 0.1 }),
  };
}

/** WCAG 2 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text color for a filled background (buttons, bars): white when it reaches 3:1 (WCAG AA for
 * large/bold text and UI components, which is how accent and navy fills are used), otherwise
 * the dark color. The admin contrast check reports the exact ratios.
 */
export function readableForeground(
  background: string,
  dark = "#121729",
  light = "#ffffff",
): string {
  return contrastRatio(background, light) >= 3 ? light : dark;
}

export type ContrastResult = { ratio: number; aa: boolean; aaLarge: boolean };

function result(a: string, b: string): ContrastResult {
  const ratio = Math.round(contrastRatio(a, b) * 100) / 100;
  return { ratio, aa: ratio >= 4.5, aaLarge: ratio >= 3 };
}

/** Contrast of accent text on a white page and of white text on an accent button. */
export function checkAccentContrast(accent: string, page = "#ffffff") {
  return { accentOnPage: result(accent, page), whiteOnAccent: result("#ffffff", accent) };
}
