import { env } from "@/core/env";

export const MEDIA_BUCKET = "media";

/** The public fields of a media asset (what the public site and pickers need). */
export type MediaAsset = {
  id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Column list for selecting a MediaAsset (never `*`: anon cannot read uploaded_by). */
export const MEDIA_ASSET_COLUMNS =
  "id, storage_path, filename, mime_type, size_bytes, width, height, alt_text, caption, folder_id, created_at, updated_at";

export type MediaFolder = { id: string; name: string; parent_id: string | null };

/** Public URL of a stored file (the media bucket is public). */
export function mediaPublicUrl(storagePath: string): string {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const path = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export function isImage(asset: Pick<MediaAsset, "mime_type">): boolean {
  return asset.mime_type.startsWith("image/");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
