import { cn } from "@/lib/utils";

/** Small uppercase label with an accent rule, as used above headings in docs/design. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-accent uppercase",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-accent" />
      {children}
    </p>
  );
}
