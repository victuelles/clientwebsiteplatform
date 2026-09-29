import { ActionLink } from "@/components/shared/action-link";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SiteContainer } from "@/components/site/container";
import { getSiteSettings } from "@/core/settings/get-settings";

// Placeholder that exercises the theme and CTA primitives. The real homepage arrives in Phase 4.
export default async function HomePage() {
  const settings = await getSiteSettings();
  return (
    <main className="flex flex-1 items-center bg-muted py-24">
      <SiteContainer className="space-y-7">
        <Eyebrow className="text-muted-foreground">{settings.tagline ?? "Placeholder"}</Eyebrow>
        <h1 className="max-w-3xl text-4xl leading-[1.1] font-bold tracking-tight sm:text-6xl">
          {settings.siteName} <span className="text-accent">homepage coming soon.</span>
        </h1>
        {settings.description && (
          <p className="max-w-xl text-muted-foreground">{settings.description}</p>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ActionLink href="/services" variant="accent" arrow="right">
            Accent button
          </ActionLink>
          <ActionLink href="/about" variant="dark" arrow="right">
            Dark button
          </ActionLink>
          <ActionLink href="/about" variant="text" arrow="right">
            Text link
          </ActionLink>
        </div>
      </SiteContainer>
    </main>
  );
}
