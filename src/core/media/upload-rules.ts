// Upload rules shared by the browser (early feedback) and the server (enforcement).

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const UPLOAD_TYPES = {
  "image/jpeg": { ext: "jpg", label: "JPEG" },
  "image/png": { ext: "png", label: "PNG" },
  "image/webp": { ext: "webp", label: "WebP" },
  "image/avif": { ext: "avif", label: "AVIF" },
  "image/gif": { ext: "gif", label: "GIF" },
  "application/pdf": { ext: "pdf", label: "PDF" },
  "image/svg+xml": { ext: "svg", label: "SVG" },
} as const;

export type UploadMimeType = keyof typeof UPLOAD_TYPES;

/** SVG can contain scripts, so only the super admin may upload it (and it is sanitized). */
export const SUPER_ADMIN_ONLY_TYPES: readonly UploadMimeType[] = ["image/svg+xml"];

export function isUploadMimeType(value: string): value is UploadMimeType {
  return value in UPLOAD_TYPES;
}

export type UploadCheck = { ok: true; mimeType: UploadMimeType } | { ok: false; error: string };

export function validateUpload(
  file: { mimeType: string; size: number; filename: string },
  options: { allowSvg: boolean },
): UploadCheck {
  const mimeType = file.mimeType.toLowerCase();
  if (!file.filename.trim()) return { ok: false, error: "The file needs a name." };
  if (!isUploadMimeType(mimeType)) {
    return {
      ok: false,
      error: `${file.filename}: this file type isn't supported. Use JPEG, PNG, WebP, AVIF, GIF, or PDF.`,
    };
  }
  if (SUPER_ADMIN_ONLY_TYPES.includes(mimeType) && !options.allowSvg) {
    return { ok: false, error: `${file.filename}: only the site owner can upload SVG files.` };
  }
  if (file.size <= 0) return { ok: false, error: `${file.filename} is empty.` };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `${file.filename} is larger than 10 MB.` };
  }
  return { ok: true, mimeType };
}

/** Where a new upload is stored. The random name avoids collisions and guessable paths. */
export function storagePathFor(
  mimeType: UploadMimeType,
  now = new Date(),
  id = crypto.randomUUID(),
): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `library/${year}/${month}/${id}.${UPLOAD_TYPES[mimeType].ext}`;
}

const STORAGE_PATH = /^library\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif|pdf|svg)$/;

export function isLibraryStoragePath(path: string): boolean {
  return STORAGE_PATH.test(path);
}

/** Detects the real file type from its first bytes (never trust the browser's claim). */
export function sniffMimeType(bytes: Uint8Array): UploadMimeType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "image/avif";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg")))
    return "image/svg+xml";
  return null;
}
