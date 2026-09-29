import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TopBar } from "@/components/site/top-bar";
import { getSiteSettings } from "@/core/settings/get-settings";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar settings={settings} />
      <SiteHeader settings={settings} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter settings={settings} />
    </div>
  );
}
