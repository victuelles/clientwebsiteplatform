import { MediaImage } from "@/components/media/media-image";
import type { MediaAsset } from "@/core/media/types";
import { cn } from "@/lib/utils";

type LogoAsset = Pick<MediaAsset, "storage_path" | "mime_type" | "width" | "height" | "alt_text">;

/** The fallback mark from the design: a skewed accent block with the site's first letter. */
export function LogoMark({ siteName, className }: { siteName: string; className?: string }) {
  const letter =
    siteName
      .trim()
      .match(/[\p{L}\p{N}]/u)?.[0]
      ?.toUpperCase() ?? "•";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 -skew-x-12 items-center justify-center bg-accent",
        className,
      )}
    >
      <span className="skew-x-12 text-lg leading-none font-black text-accent-foreground italic">
        {letter}
      </span>
    </span>
  );
}

/**
 * The site logo: the uploaded image when there is one, otherwise the design's wordmark (mark +
 * uppercase site name). `tone` is the background it sits on.
 */
export function Logo({
  siteName,
  asset,
  tone = "dark",
  className,
}: {
  siteName: string;
  asset?: LogoAsset | null;
  tone?: "dark" | "light";
  className?: string;
}) {
  if (asset) {
    return (
      <MediaImage
        asset={asset}
        alt={asset.alt_text || siteName}
        className={cn("h-9 w-auto max-w-48 object-contain object-left", className)}
        sizes="192px"
        preload
      />
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark siteName={siteName} />
      <span
        className={cn(
          "text-lg leading-none font-bold tracking-tight uppercase",
          tone === "dark" ? "text-navy-foreground" : "text-foreground",
        )}
      >
        {siteName}
      </span>
    </span>
  );
}
