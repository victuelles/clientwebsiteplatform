import { cn } from "@/lib/utils";

/** The public site's content column: 1192px wide at desktop, as in docs/design. */
export function SiteContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-4.5 lg:px-6", className)} {...props} />
  );
}
