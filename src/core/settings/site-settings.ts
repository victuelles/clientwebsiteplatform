import "server-only";

import { cache } from "react";

import { siteConfig } from "@/core/site";
import { createClient } from "@/core/supabase/server";

export type SiteSettings = { siteName: string; contactEmail: string | null };

/** The single site_settings row (readable by anyone). Cached per request. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("site_name, contact_email")
    .maybeSingle();
  return {
    siteName: data?.site_name ?? siteConfig.name,
    contactEmail: data?.contact_email ?? null,
  };
});
