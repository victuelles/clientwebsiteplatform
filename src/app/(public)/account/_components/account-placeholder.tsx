import { Eyebrow } from "@/components/shared/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { SiteIcon } from "@/core/icons/icon";
import type { ModuleManifest } from "@/core/modules/types";

/** An account page whose module is not built yet. */
export function AccountPlaceholder({
  title,
  manifest,
}: {
  title: string;
  manifest: ModuleManifest;
}) {
  return (
    <>
      <div className="space-y-3">
        <Eyebrow>Your account</Eyebrow>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      </div>
      <Card className="shadow-sm ring-border">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <SiteIcon name={manifest.icon} className="size-7 text-accent" />
          <p className="font-medium">Coming soon</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This page will list your {manifest.label.toLowerCase()} activity once it&apos;s
            available.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
