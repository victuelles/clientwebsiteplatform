"use client";

import { CheckCircle2, CircleAlert, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { UPLOAD_TYPES } from "@/core/media/upload-rules";
import { cn } from "@/lib/utils";

import type { UploadItem } from "./use-media-upload";

export function uploadAccept(allowSvg: boolean, imagesOnly = false) {
  return Object.keys(UPLOAD_TYPES)
    .filter(
      (type) =>
        (allowSvg || type !== "image/svg+xml") && (!imagesOnly || type.startsWith("image/")),
    )
    .join(",");
}

/** File picker button + drag-and-drop target. */
export function UploadZone({
  onFiles,
  accept,
  children,
  className,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      data-testid="upload-zone"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors",
        compact ? "px-4 py-4 sm:flex-row sm:justify-between sm:text-left" : "px-6 py-10",
        dragging ? "border-accent bg-accent/5" : "border-border bg-muted",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3", !compact && "flex-col")}>
        <Upload aria-hidden className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {children ??
            "Drag files here, or choose files. JPEG, PNG, WebP, AVIF, GIF, or PDF up to 10 MB."}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        aria-label="Choose files to upload"
        onChange={(event) => {
          if (event.target.files?.length) onFiles(Array.from(event.target.files));
          event.target.value = "";
        }}
      />
      <Button type="button" variant="outline" onClick={() => input.current?.click()}>
        Choose files
      </Button>
    </div>
  );
}

export function UploadQueue({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="Uploads">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border px-3 py-2 text-sm" data-testid="upload-item">
          <div className="flex items-center gap-2">
            {item.status === "done" ? (
              <CheckCircle2 aria-hidden className="size-4 text-success" />
            ) : item.status === "error" ? (
              <CircleAlert aria-hidden className="size-4 text-destructive" />
            ) : (
              <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate">{item.filename}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {item.status === "processing"
                ? "Processing"
                : item.status === "done"
                  ? "Uploaded"
                  : item.status === "error"
                    ? "Failed"
                    : `${item.progress}%`}
            </span>
          </div>
          {(item.status === "uploading" || item.status === "processing") && (
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={item.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading ${item.filename}`}
            >
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
          {item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
        </li>
      ))}
    </ul>
  );
}
