import { PowerOff } from "lucide-react";

import { getScope } from "@/core/access/scopes";

/** Shown to the super admin on a page whose module is turned off (staff get a 404 instead). */
export function ModuleDisabledNotice({ scope }: { scope: string }) {
  const label = getScope(scope)?.label ?? scope;
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted px-6 py-16 text-center">
      <PowerOff aria-hidden className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">This module is turned off</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {label} is disabled for this site, so staff can&apos;t see it and nothing new can be
        created. Existing data is kept. Turn it on from Modules to use it again.
      </p>
    </div>
  );
}
