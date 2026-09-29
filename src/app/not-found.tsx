import { ActionLink } from "@/components/shared/action-link";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SiteContainer } from "@/components/site/container";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TopBar } from "@/components/site/top-bar";
import { getSiteSettings } from "@/core/settings/get-settings";

// Unmatched URLs render here, outside the (public) layout, so this page adds the site chrome.
export default async function NotFound() {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar settings={settings} />
      <SiteHeader settings={settings} />
      <main className="flex flex-1 items-center bg-muted py-24">
        <SiteContainer className="flex flex-col items-center gap-5 text-center">
          <Eyebrow>404</Eyebrow>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
          <p className="max-w-md text-muted-foreground">
            The page you are looking for doesn&apos;t exist or has moved.
          </p>
          <ActionLink href="/" variant="accent" arrow="right">
            Back to home
          </ActionLink>
        </SiteContainer>
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
