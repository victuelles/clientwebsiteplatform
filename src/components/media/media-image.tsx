import Image, { type ImageProps } from "next/image";

import { mediaPublicUrl, type MediaAsset } from "@/core/media/types";

type MediaImageProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  asset: Pick<MediaAsset, "storage_path" | "mime_type" | "width" | "height" | "alt_text">;
  /** Overrides the asset's alt text (use "" for purely decorative images). */
  alt?: string;
};

/**
 * The only way to render a media library image. Uses the asset's stored width, height, and alt
 * text; SVG and GIF are served as-is (not optimized). Pass `fill` + `sizes` for responsive boxes.
 */
export function MediaImage({ asset, alt, fill, ...props }: MediaImageProps) {
  const unoptimized = asset.mime_type === "image/svg+xml" || asset.mime_type === "image/gif";
  const sizing =
    fill || !asset.width || !asset.height
      ? { fill: true as const }
      : { width: asset.width, height: asset.height };
  return (
    <Image
      src={mediaPublicUrl(asset.storage_path)}
      alt={alt ?? asset.alt_text ?? ""}
      unoptimized={unoptimized}
      {...sizing}
      {...props}
    />
  );
}
