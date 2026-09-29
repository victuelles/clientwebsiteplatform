import { z } from "zod";

import { socialLinksSchema } from "./social";
import { themeSchema } from "./theme";

// Form schemas for the settings admin (one per tab). Keys map to site_settings columns in
// src/app/(admin)/admin/settings/actions.ts.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((v) => v || null);

/** "/path", "https://…", "mailto:…" or "tel:…"; empty means none. */
export const linkHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      v === "" || /^\/(?!\/)/.test(v) || /^https:\/\/\S+$/.test(v) || /^(mailto|tel):\S+$/.test(v),
    "Use a path like /contact, or a full https:// link.",
  )
  .transform((v) => v || null);

const mediaId = z.uuid().nullable();

export const generalSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "Enter the site name.").max(100),
  tagline: optionalText(150),
  description: optionalText(500),
});

export const contactSettingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address.")
    .transform((v) => v || null),
  phone: optionalText(50),
  locationLabel: optionalText(100),
  address: optionalText(300),
  mapUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full https:// link.")
    .transform((v) => v || null),
});

export const brandingSettingsSchema = z.object({
  logoMediaId: mediaId,
  logoOnDarkMediaId: mediaId,
  faviconMediaId: mediaId,
  theme: themeSchema,
});

export const headerFooterSettingsSchema = z.object({
  showTopBar: z.boolean(),
  headerCtaLabel: optionalText(40),
  headerCtaHref: linkHrefSchema,
  footerCopyright: optionalText(200),
  privacyHref: linkHrefSchema,
  termsHref: linkHrefSchema,
});

export const socialSettingsSchema = z.object({ socialLinks: socialLinksSchema });

export const seoSettingsSchema = z.object({
  seoTitleTemplate: z
    .string()
    .trim()
    .max(100)
    .refine((v) => v === "" || v.includes("%s"), "Include %s where the page title goes.")
    .transform((v) => v || null),
  seoDescription: optionalText(300),
  ogImageMediaId: mediaId,
  allowIndexing: z.boolean(),
});

export const SETTINGS_SECTIONS = {
  general: generalSettingsSchema,
  contact: contactSettingsSchema,
  branding: brandingSettingsSchema,
  headerFooter: headerFooterSettingsSchema,
  social: socialSettingsSchema,
  seo: seoSettingsSchema,
} as const;

export type SettingsSection = keyof typeof SETTINGS_SECTIONS;
export type SettingsSectionInput<S extends SettingsSection> = z.input<
  (typeof SETTINGS_SECTIONS)[S]
>;
