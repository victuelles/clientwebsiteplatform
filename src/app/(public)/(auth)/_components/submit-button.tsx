import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Full-width accent button styled like the CTAs in docs/design. */
export function SubmitButton({
  pending,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending}
      className={cn("h-11 w-full text-xs font-semibold tracking-widest uppercase", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
