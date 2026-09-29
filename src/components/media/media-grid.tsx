"use client";

import { FileText, Folder, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatBytes, isImage, type MediaAsset, type MediaFolder } from "@/core/media/types";
import { cn } from "@/lib/utils";

import { MediaImage } from "./media-image";

export function MediaThumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-muted", className)}>
      {isImage(asset) ? (
        <MediaImage
          asset={asset}
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover"
          alt=""
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <FileText aria-hidden className="size-8" />
          <span className="text-xs uppercase">{asset.filename.split(".").pop()}</span>
        </div>
      )}
    </div>
  );
}

export function MissingAltBadge({ asset }: { asset: MediaAsset }) {
  if (!isImage(asset) || asset.alt_text) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1 border-accent/50 bg-background text-accent"
      title="This image has no alt text"
    >
      <TriangleAlert aria-hidden className="size-3" />
      No alt text
    </Badge>
  );
}

/** Folders then files, as a grid or a list. Selection/opening is up to the caller. */
export function MediaGrid({
  folders,
  assets,
  view,
  selectedId,
  onOpenFolder,
  onOpenAsset,
  folderActions,
}: {
  folders: MediaFolder[];
  assets: MediaAsset[];
  view: "grid" | "list";
  selectedId?: string | null;
  onOpenFolder: (folder: MediaFolder) => void;
  onOpenAsset: (asset: MediaAsset) => void;
  folderActions?: (folder: MediaFolder) => React.ReactNode;
}) {
  if (view === "list") {
    return (
      <ul className="divide-y rounded-lg border" data-testid="media-list">
        {folders.map((folder) => (
          <li key={folder.id} className="flex items-center gap-3 px-3 py-2">
            <button
              type="button"
              onClick={() => onOpenFolder(folder)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left hover:text-accent"
            >
              <Folder aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{folder.name}</span>
            </button>
            {folderActions?.(folder)}
          </li>
        ))}
        {assets.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => onOpenAsset(asset)}
              aria-pressed={selectedId === asset.id}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted",
                selectedId === asset.id && "bg-accent/10",
              )}
            >
              <MediaThumb asset={asset} className="size-10 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{asset.filename}</span>
              <MissingAltBadge asset={asset} />
              <span className="hidden w-24 text-right text-xs text-muted-foreground sm:inline">
                {asset.width && asset.height ? `${asset.width}×${asset.height}` : "—"}
              </span>
              <span className="w-16 text-right text-xs text-muted-foreground">
                {formatBytes(asset.size_bytes)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      data-testid="media-grid"
    >
      {folders.map((folder) => (
        <li key={folder.id} className="relative">
          <button
            type="button"
            onClick={() => onOpenFolder(folder)}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted p-3 hover:border-accent"
          >
            <Folder aria-hidden className="size-10 text-muted-foreground" />
            <span className="w-full truncate text-center text-sm font-medium">{folder.name}</span>
          </button>
          {folderActions && <div className="absolute top-1 right-1">{folderActions(folder)}</div>}
        </li>
      ))}
      {assets.map((asset) => (
        <li key={asset.id}>
          <button
            type="button"
            onClick={() => onOpenAsset(asset)}
            aria-pressed={selectedId === asset.id}
            aria-label={asset.filename}
            className={cn(
              "group relative block w-full overflow-hidden rounded-lg border text-left hover:border-accent",
              selectedId === asset.id && "ring-2 ring-accent",
            )}
          >
            <MediaThumb asset={asset} />
            <span className="absolute top-1 left-1">
              <MissingAltBadge asset={asset} />
            </span>
            <span className="block truncate border-t px-2 py-1.5 text-xs">{asset.filename}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
