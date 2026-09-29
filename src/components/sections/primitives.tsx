import { ImageIcon } from "lucide-react";
import Link from "next/link";

import { actionClassName, type ActionVariant } from "@/components/shared/action-link";
import { MediaImage } from "@/components/media/media-image";
import { linkAttributes, resolveLink } from "@/core/links/resolve";
import type { LinkWithLabel } from "@/core/links/types";
import type { MediaValue } from "@/core/sections/common";
import type { RichTextDoc } from "@/core/sections/rich-text";
import { renderRichText } from "@/core/sections/render-rich-text";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import type { SectionRenderContext } from "./context";
import type { SectionTone } from "./section-shell";

/** The design's eyebrow: short dash + uppercase wide-tracked label. */
export function SectionEyebrow({
  children,
  tone,
  color = "accent",
  className,
}: {
  children: React.ReactNode;
  tone: SectionTone;
  /** "accent" (most sections) or "muted" (hero, intro), per the design. */
  color?: "accent" | "muted";
  className?: string;
}) {
  if (!children) return null;
  const colorClass =
    tone === "accent"
      ? "text-accent-foreground"
      : color === "muted"
        ? tone === "dark"
          ? "text-navy-foreground/70"
          : "text-muted-foreground"
        : "text-accent";
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-[11px] leading-none font-bold tracking-[0.2em] uppercase",
        colorClass,
        className,
      )}
    >
      {tone !== "accent" && <span aria-hidden className="h-0.5 w-5 bg-current" />}
      {children}
    </p>
  );
}

/** A section heading, as h1 or h2 depending on the section's position (heading rule). */
export function SectionHeading({
  as: Tag,
  children,
  className,
}: {
  as: "h1" | "h2";
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <Tag
      className={cn(
        "font-heading text-[34px] leading-[1.12] font-normal tracking-tight lg:text-[46px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function RichTextContent({
  doc,
  tone,
  className,
}: {
  doc: RichTextDoc | null | undefined;
  tone: SectionTone;
  className?: string;
}) {
  const html = renderRichText(doc);
  if (!html) return null;
  return (
    <div
      className={cn(
        "space-y-4 leading-[1.85] [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1",
        tone === "light"
          ? "text-muted-foreground [&_a]:text-accent [&_strong]:text-foreground"
          : "opacity-85",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** An image from the media library, or a neutral placeholder when empty or missing. */
export function SectionImage({
  value,
  ctx,
  sizes,
  className,
  imgClassName,
  alt,
  priority,
  quietPlaceholder,
}: {
  value: MediaValue | undefined;
  ctx: SectionRenderContext;
  sizes: string;
  className?: string;
  imgClassName?: string;
  alt?: string;
  priority?: boolean;
  /** Hide the placeholder's image icon (e.g. behind hero text). */
  quietPlaceholder?: boolean;
}) {
  const asset = value ? ctx.media[value.mediaId] : undefined;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {asset ? (
        <MediaImage
          asset={asset}
          alt={alt}
          fill
          sizes={sizes}
          className={cn("object-cover", imgClassName)}
          preload={priority}
        />
      ) : (
        <div
          className="flex h-full min-h-24 w-full items-center justify-center bg-[color-mix(in_oklch,var(--muted),var(--foreground)_6%)] text-muted-foreground"
          data-testid="image-placeholder"
        >
          {!quietPlaceholder && <ImageIcon aria-hidden className="size-8 opacity-60" />}
          <span className="sr-only">{alt ?? "Image"}</span>
        </div>
      )}
    </div>
  );
}

/** A button or text link from a LinkWithLabel; renders nothing if the link is hidden. */
export function SectionAction({
  action,
  ctx,
  variant,
  arrow,
  className,
}: {
  action: LinkWithLabel | null | undefined;
  ctx: SectionRenderContext;
  variant: ActionVariant | "light" | "text-light";
  arrow?: "up-right" | "right";
  className?: string;
}) {
  if (!action?.label) return null;
  const resolved = resolveLink(action.link, ctx.links);
  if (!resolved) return null;
  const attrs = linkAttributes(resolved);
  const Icon = arrow === "up-right" ? ArrowUpRight : ArrowRight;
  const classes =
    variant === "light"
      ? cn(
          actionClassName("accent", className),
          "bg-background text-foreground hover:bg-background/90 active:bg-background/80",
        )
      : variant === "text-light"
        ? cn(actionClassName("text", className), "text-current hover:text-current hover:opacity-80")
        : actionClassName(variant, className);
  return (
    <Link {...attrs} className={classes}>
      {action.label}
      {arrow && (
        <Icon
          aria-hidden
          className={cn("size-3.5 shrink-0", variant.startsWith("text") && "text-accent")}
          strokeWidth={2.25}
        />
      )}
    </Link>
  );
}
