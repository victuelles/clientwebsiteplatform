import type { MetadataRoute } from "next";

import { env } from "@/core/env";
import { getSiteSettings } from "@/core/settings/get-settings";

// New client sites stay out of search engines until "Allow search engines to index this site"
// is turned on in Settings > SEO. The full sitemap comes in Phase 15.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  if (!settings.allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/auth/"] },
    host: env.NEXT_PUBLIC_SITE_URL,
  };
}
