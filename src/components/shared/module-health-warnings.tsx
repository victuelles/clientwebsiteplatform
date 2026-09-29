import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { ModuleHealthWarning } from "@/core/modules/types";

/** Health warnings for a module (missing integrations and the module's own checks). */
export function ModuleHealthWarnings({ warnings }: { warnings: readonly ModuleHealthWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul
      data-testid="module-health"
      className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm"
    >
      {warnings.map((warning) => (
        <li key={warning.message} className="flex gap-2">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            {warning.message}
            {warning.href && (
              <>
                {" "}
                <Link href={warning.href} className="font-medium underline">
                  Fix this
                </Link>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
