import type { SectionBackground, SectionPadding } from "@/core/sections/common";
import { cn } from "@/lib/utils";

export type SectionTone = "light" | "dark" | "accent";

export function toneFor(background: SectionBackground): SectionTone {
  return background === "navy" ? "dark" : background === "accent" ? "accent" : "light";
}

const BACKGROUND_CLASSES: Record<SectionBackground, string> = {
  white: "bg-background text-foreground",
  light: "bg-muted text-foreground",
  navy: "bg-navy text-navy-foreground",
  accent: "bg-accent text-accent-foreground",
};

const PADDING_CLASSES: Record<SectionPadding, string> = {
  normal: "py-16 lg:py-[104px]",
  compact: "py-10 lg:py-14",
  none: "py-0",
};

/** Outer wrapper for every section: background, padding, and the in-page anchor. */
export function SectionShell({
  id,
  anchorId,
  background,
  padding,
  className,
  children,
  preview,
}: {
  id: string;
  anchorId: string | null;
  background: SectionBackground;
  padding: SectionPadding;
  className?: string;
  children: React.ReactNode;
  preview?: boolean;
}) {
  return (
    <section
      id={anchorId ?? undefined}
      data-section-id={preview ? id : undefined}
      className={cn(
        "relative scroll-mt-24",
        BACKGROUND_CLASSES[background],
        PADDING_CLASSES[padding],
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Secondary text color for the section's tone. */
export function mutedText(tone: SectionTone) {
  return tone === "dark"
    ? "text-navy-foreground/65"
    : tone === "accent"
      ? "text-accent-foreground/85"
      : "text-muted-foreground";
}
