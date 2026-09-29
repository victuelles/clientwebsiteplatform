import type { Metadata } from "next";

import { requireSuperAdmin } from "@/core/access/guard";
import { MEDIA_ASSET_COLUMNS, type MediaAsset } from "@/core/media/types";
import { parseSocialLinks } from "@/core/settings/social";
import { parseTheme } from "@/core/settings/theme";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../_shell/page-header";
import { IntegrationsPanel } from "./_components/integrations-panel";
import { SettingsTabs, type SettingsFormValues } from "./_components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSuperAdmin();
  // Read fresh (not the public cache) so the admin always edits the current values.
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("site_settings").select("*").single();
  if (error) throw new Error(`Could not load settings: ${error.message}`);

  const mediaIds = [
    row.logo_media_id,
    row.logo_on_dark_media_id,
    row.favicon_media_id,
    row.og_image_media_id,
  ].filter((id): id is string => Boolean(id));
  const { data: media } = mediaIds.length
    ? await supabase.from("media_assets").select(MEDIA_ASSET_COLUMNS).in("id", mediaIds)
    : { data: [] as MediaAsset[] };
  const assets = Object.fromEntries((media ?? []).map((asset) => [asset.id, asset]));

  const values: SettingsFormValues = {
    general: {
      siteName: row.site_name,
      tagline: row.tagline ?? "",
      description: row.description ?? "",
    },
    contact: {
      contactEmail: row.contact_email ?? "",
      phone: row.phone ?? "",
      locationLabel: row.location_label ?? "",
      address: row.address ?? "",
      mapUrl: row.map_url ?? "",
    },
    branding: {
      logoMediaId: row.logo_media_id,
      logoOnDarkMediaId: row.logo_on_dark_media_id,
      faviconMediaId: row.favicon_media_id,
      theme: parseTheme(row.theme),
    },
    headerFooter: {
      showTopBar: row.show_top_bar,
      headerCtaLabel: row.header_cta_label ?? "",
      headerCtaHref: row.header_cta_href ?? "",
      footerCopyright: row.footer_copyright ?? "",
      privacyHref: row.privacy_href ?? "",
      termsHref: row.terms_href ?? "",
    },
    social: { socialLinks: parseSocialLinks(row.social_links) },
    seo: {
      seoTitleTemplate: row.seo_title_template ?? "",
      seoDescription: row.seo_description ?? "",
      ogImageMediaId: row.og_image_media_id,
      allowIndexing: row.allow_indexing,
    },
  };

  return (
    <>
      <AdminPageHeader
        title="Settings"
        breadcrumbs={[{ label: "Settings" }]}
        description="Site details, branding, and integrations. Saved changes appear on the live site right away."
      />
      <SettingsTabs values={values} assets={assets} integrations={<IntegrationsPanel />} />
    </>
  );
}
