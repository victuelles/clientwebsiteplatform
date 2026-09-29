import "server-only";

import { cache } from "react";

import { siteConfig } from "@/core/site";
import { createCachedPublicClient } from "@/core/supabase/public";

import { parseSocialLinks, type SocialLink } from "./social";
import { DEFAULT_THEME, parseTheme, type Theme } from "./theme";

/** Cache tag for everything derived from site_settings. Saves call updateTag(SITE_SETTINGS_TAG). */
export const SITE_SETTINGS_TAG = "site-settings";

export type SiteSettings = {
  siteName: string;
  tagline: string | null;
  description: string | null;
  contactEmail: string | null;
  phone: string | null;
  locationLabel: string | null;
  address: string | null;
  mapUrl: string | null;
  socialLinks: SocialLink[];
  logoMediaId: string | null;
  logoOnDarkMediaId: string | null;
  faviconMediaId: string | null;
  ogImageMediaId: string | null;
  theme: Theme;
  showTopBar: boolean;
  headerCtaLabel: string | null;
  headerCtaHref: string | null;
  /** With "{year}" already replaced. */
  footerCopyright: string | null;
  privacyHref: string | null;
  termsHref: string | null;
  seoTitleTemplate: string | null;
  /** seo_description, falling back to description. */
  seoDescription: string | null;
  allowIndexing: boolean;
};

const FALLBACK: SiteSettings = {
  siteName: siteConfig.name,
  tagline: null,
  description: null,
  contactEmail: null,
  phone: null,
  locationLabel: null,
  address: null,
  mapUrl: null,
  socialLinks: [],
  logoMediaId: null,
  logoOnDarkMediaId: null,
  faviconMediaId: null,
  ogImageMediaId: null,
  theme: DEFAULT_THEME,
  showTopBar: true,
  headerCtaLabel: null,
  headerCtaHref: null,
  footerCopyright: null,
  privacyHref: null,
  termsHref: null,
  seoTitleTemplate: null,
  seoDescription: null,
  allowIndexing: false,
};

/**
 * Site settings for this deployment. Cached across requests in the Data Cache (tag
 * "site-settings") and deduplicated within a request. Falls back to safe defaults (and no
 * indexing) if the database is unreachable, so the site still renders.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createCachedPublicClient([SITE_SETTINGS_TAG]);
  const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
  if (error || !data) {
    if (error) console.error(`Could not load site settings: ${error.message}`);
    return FALLBACK;
  }

  const year = String(new Date().getFullYear());
  return {
    siteName: data.site_name,
    tagline: data.tagline,
    description: data.description,
    contactEmail: data.contact_email,
    phone: data.phone,
    locationLabel: data.location_label,
    address: data.address,
    mapUrl: data.map_url,
    socialLinks: parseSocialLinks(data.social_links),
    logoMediaId: data.logo_media_id,
    logoOnDarkMediaId: data.logo_on_dark_media_id,
    faviconMediaId: data.favicon_media_id,
    ogImageMediaId: data.og_image_media_id,
    theme: parseTheme(data.theme),
    showTopBar: data.show_top_bar,
    headerCtaLabel: data.header_cta_label,
    headerCtaHref: data.header_cta_href,
    footerCopyright: data.footer_copyright?.replaceAll("{year}", year) ?? null,
    privacyHref: data.privacy_href,
    termsHref: data.terms_href,
    seoTitleTemplate: data.seo_title_template,
    seoDescription: data.seo_description ?? data.description,
    allowIndexing: data.allow_indexing,
  };
});
