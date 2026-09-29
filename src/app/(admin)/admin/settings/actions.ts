"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { protectedAction, toActionError } from "@/core/access/protected-action";
import { SITE_SETTINGS_TAG } from "@/core/settings/get-settings";
import { SETTINGS_SECTIONS } from "@/core/settings/schemas";

// camelCase form fields -> site_settings columns.
const COLUMNS: Record<string, string> = {
  siteName: "site_name",
  tagline: "tagline",
  description: "description",
  contactEmail: "contact_email",
  phone: "phone",
  locationLabel: "location_label",
  address: "address",
  mapUrl: "map_url",
  socialLinks: "social_links",
  logoMediaId: "logo_media_id",
  logoOnDarkMediaId: "logo_on_dark_media_id",
  faviconMediaId: "favicon_media_id",
  ogImageMediaId: "og_image_media_id",
  theme: "theme",
  showTopBar: "show_top_bar",
  headerCtaLabel: "header_cta_label",
  headerCtaHref: "header_cta_href",
  footerCopyright: "footer_copyright",
  privacyHref: "privacy_href",
  termsHref: "terms_href",
  seoTitleTemplate: "seo_title_template",
  seoDescription: "seo_description",
  allowIndexing: "allow_indexing",
};

const saveSchema = z.discriminatedUnion(
  "section",
  Object.entries(SETTINGS_SECTIONS).map(([section, schema]) =>
    z.object({ section: z.literal(section), values: schema }),
  ) as unknown as [z.ZodObject<{ section: z.ZodLiteral<string>; values: z.ZodType }>],
);

/**
 * Saves one settings tab through update_site_settings (super admin only, audited), then expires
 * the "site-settings" cache tag so the live site updates on the next request.
 */
export const saveSettings = protectedAction({
  role: "super_admin",
  schema: saveSchema,
  handler: async ({ input, supabase }) => {
    const values = input.values as Record<string, unknown>;
    const changes = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [COLUMNS[key]!, value]),
    );
    const { data, error } = await supabase.rpc("update_site_settings", {
      changes: changes as never,
    });
    if (error) throw toActionError(error);
    updateTag(SITE_SETTINGS_TAG);
    return { changed: data ?? [] };
  },
});
