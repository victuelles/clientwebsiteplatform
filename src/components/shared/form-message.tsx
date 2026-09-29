import { cn } from "@/lib/utils";

/** Form-level error or success message. */
export function FormMessage({
  kind,
  children,
  className,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "border-l-2 px-3 py-2 text-sm",
        kind === "error"
          ? "border-destructive bg-destructive/5 text-destructive"
          : "border-success bg-success/5 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
