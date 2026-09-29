import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// The design's call-to-action primitives: solid accent, solid dark, and uppercase text link,
// each with an optional arrow. Use these for CTAs across the public site.

const VARIANTS = {
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active",
  dark: "bg-navy text-navy-foreground hover:bg-navy-hover active:bg-navy-active",
  text: "text-foreground hover:text-accent",
} as const;

export type ActionVariant = keyof typeof VARIANTS;

export function actionClassName(variant: ActionVariant, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2.5 text-[11px] leading-none font-bold tracking-[0.14em] whitespace-nowrap uppercase transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    variant === "text" ? "h-auto" : "h-11.5 rounded-lg px-5",
    VARIANTS[variant],
    className,
  );
}

function Arrow({ arrow }: { arrow: "up-right" | "right" }) {
  const Icon = arrow === "up-right" ? ArrowUpRight : ArrowRight;
  return (
    <Icon aria-hidden className={cn("size-3.5 shrink-0", "text-current")} strokeWidth={2.25} />
  );
}

export function ActionLink({
  href,
  variant = "accent",
  arrow,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "className"> & {
  variant?: ActionVariant;
  arrow?: "up-right" | "right";
  className?: string;
}) {
  return (
    <Link href={href} className={actionClassName(variant, className)} {...props}>
      {children}
      {arrow && (
        <span className={cn(variant === "text" && "text-accent")}>
          <Arrow arrow={arrow} />
        </span>
      )}
    </Link>
  );
}
