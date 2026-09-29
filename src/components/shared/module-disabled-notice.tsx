import { PowerOff } from "lucide-react";
import Link from "next/link";

import { getScope } from "@/core/access/scopes";

/**
 * Shown to the super admin above a turned-off module's admin page, whose data then renders
 * read-only (staff get a 404 instead). Edit controls hide themselves because
 * context.check({ scope, action: "edit" }) is "module_disabled", not "allowed".
 */
export function ModuleDisabledNotice({ scope }: { scope: string }) {
  const label = getScope(scope)?.label ?? scope;
  return (
    <div
      role="status"
      data-testid="module-disabled-notice"
      className="flex gap-3 rounded-lg border border-dashed bg-muted p-4 text-sm"
    >
      <PowerOff aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-semibold">This module is turned off</p>
        <p className="text-muted-foreground">
          {label} is disabled for this site, so staff and visitors can&apos;t see it and nothing can
          be created, changed, or deleted. Its data is kept and shown here read-only.{" "}
          <Link href="/admin/modules" className="font-medium text-foreground underline">
            Turn it on from Modules
          </Link>{" "}
          to use it again.
        </p>
      </div>
    </div>
  );
}
