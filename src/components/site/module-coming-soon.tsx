import { ActionLink } from "@/components/shared/action-link";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SiteContainer } from "@/components/site/container";
import { SiteIcon } from "@/core/icons/icon";
import type { ModuleManifest } from "@/core/modules/types";

/** Placeholder for a module's public page until the module's phase builds it. */
export function ModuleComingSoon({
  manifest,
  title,
}: {
  manifest: ModuleManifest;
  title?: string;
}) {
  return (
    <main id="main" className="flex flex-1 items-center bg-muted py-24">
      <SiteContainer className="flex flex-col items-center gap-5 text-center">
        <SiteIcon name={manifest.icon} className="size-8 text-accent" />
        <Eyebrow>{title ?? manifest.label}</Eyebrow>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Coming soon</h1>
        <p className="max-w-md text-muted-foreground">{manifest.description}</p>
        <ActionLink href="/" variant="accent" arrow="right">
          Back to home
        </ActionLink>
      </SiteContainer>
    </main>
  );
}
