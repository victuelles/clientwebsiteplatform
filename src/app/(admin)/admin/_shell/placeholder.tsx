import { Construction } from "lucide-react";

/** Destination for nav items whose feature arrives in a later phase. */
export function PhasePlaceholder({
  phase,
  children,
}: {
  phase: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <Construction aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-medium">Coming in Phase {phase}</p>
      <p className="max-w-md text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
