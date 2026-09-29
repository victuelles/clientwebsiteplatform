import { z } from "zod";

// Settings every section has, stored in page_sections columns (not in props).

export const SECTION_BACKGROUNDS = ["white", "light", "navy", "accent"] as const;
export type SectionBackground = (typeof SECTION_BACKGROUNDS)[number];

export const SECTION_PADDINGS = ["normal", "compact", "none"] as const;
export type SectionPadding = (typeof SECTION_PADDINGS)[number];

export const BACKGROUND_LABELS: Record<SectionBackground, string> = {
  white: "White",
  light: "Light gray",
  navy: "Dark",
  accent: "Accent",
};

export const PADDING_LABELS: Record<SectionPadding, string> = {
  normal: "Normal",
  compact: "Compact",
  none: "None",
};

export const anchorIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(60)
  .refine(
    (v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
    "Use lowercase letters, numbers, and hyphens.",
  )
  .transform((v) => v || null);

export const commonSettingsSchema = z.object({
  background: z.enum(SECTION_BACKGROUNDS),
  padding: z.enum(SECTION_PADDINGS),
  anchorId: anchorIdSchema,
  isHidden: z.boolean(),
});

export type CommonSettings = z.output<typeof commonSettingsSchema>;

/** A media field's stored value: the asset id (media_references are kept by DB triggers). */
export const mediaValueSchema = z.object({ mediaId: z.uuid() }).nullable();
export type MediaValue = z.infer<typeof mediaValueSchema>;

/** Heading rule: the first section on a page renders its main heading as h1, others as h2. */
export function headingTagFor(index: number): "h1" | "h2" {
  return index === 0 ? "h1" : "h2";
}
