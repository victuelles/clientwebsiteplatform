import { NotFoundContent } from "@/components/site/not-found-content";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TopBar } from "@/components/site/top-bar";
import { getSiteSettings } from "@/core/settings/get-settings";

// URLs outside the (public) layout render here, so this page adds the site chrome.
// Public pages use (public)/not-found.tsx, which sits inside that layout.
export default async function NotFound() {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar settings={settings} />
      <SiteHeader settings={settings} />
      <NotFoundContent />
      <SiteFooter settings={settings} />
    </div>
  );
}
