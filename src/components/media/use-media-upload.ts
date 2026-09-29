"use client";

import { useCallback, useState } from "react";

import { env } from "@/core/env";
import { confirmUpload, requestUpload } from "@/core/media/actions";
import type { MediaAsset } from "@/core/media/types";
import { validateUpload } from "@/core/media/upload-rules";

export type UploadItem = {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
  asset?: MediaAsset;
};

/** PUTs the file to a signed Supabase Storage URL, reporting progress (fetch cannot). */
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    // The API gateway requires the (public) publishable key; the signed token authorizes.
    xhr.setRequestHeader("apikey", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(file);
  });
}

/**
 * Uploads files to the media library: requestUpload (permission + validation, signed URL) ->
 * direct browser upload -> confirmUpload (server re-checks the bytes and creates the row).
 */
export function useMediaUpload(options: {
  folderId: string | null;
  allowSvg: boolean;
  onUploaded?: (asset: MediaAsset) => void;
}) {
  const { folderId, allowSvg, onUploaded } = options;
  const [items, setItems] = useState<UploadItem[]>([]);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadOne = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID();
      setItems((current) => [
        ...current,
        { id, filename: file.name, progress: 0, status: "uploading" },
      ]);

      const local = validateUpload(
        { mimeType: file.type, size: file.size, filename: file.name },
        { allowSvg },
      );
      if (!local.ok) return update(id, { status: "error", error: local.error });

      const signed = await requestUpload({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });
      if (!signed.ok) return update(id, { status: "error", error: signed.error });

      try {
        await putWithProgress(signed.data.signedUrl, file, signed.data.mimeType, (progress) =>
          update(id, { progress }),
        );
      } catch (error) {
        return update(id, { status: "error", error: (error as Error).message });
      }

      update(id, { status: "processing", progress: 100 });
      const confirmed = await confirmUpload({
        path: signed.data.path,
        filename: file.name,
        folderId,
      });
      if (!confirmed.ok) return update(id, { status: "error", error: confirmed.error });

      update(id, { status: "done", asset: confirmed.data });
      onUploaded?.(confirmed.data);
    },
    [allowSvg, folderId, onUploaded],
  );

  const upload = useCallback(
    async (files: FileList | File[]) => {
      await Promise.all(Array.from(files).map(uploadOne));
    },
    [uploadOne],
  );

  const clearFinished = useCallback(
    () =>
      setItems((current) =>
        current.filter((item) => item.status === "uploading" || item.status === "processing"),
      ),
    [],
  );

  return {
    items,
    upload,
    clearFinished,
    busy: items.some((i) => i.status === "uploading" || i.status === "processing"),
  };
}
