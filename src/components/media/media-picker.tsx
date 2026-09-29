"use client";

import { ChevronRight, ImageIcon, Search } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/core/access/permissions-provider";
import { browseMedia } from "@/core/media/actions";
import type { MediaListResult } from "@/core/media/queries";
import { formatBytes, type MediaAsset } from "@/core/media/types";
import { cn } from "@/lib/utils";

import { MediaGrid, MediaThumb, MissingAltBadge } from "./media-grid";
import { UploadQueue, UploadZone, uploadAccept } from "./upload-zone";
import { useMediaUpload } from "./use-media-upload";

type Accept = "image" | "any";

/**
 * Choose a file from the media library (with search, folders, and upload in place).
 * THE way every feature picks an image or file: store the returned asset id, and record a
 * media reference when saving (see CLAUDE.md, "Media").
 */
export function MediaPicker({
  value,
  onChange,
  accept = "image",
  label = "Image",
  id,
}: {
  value: MediaAsset | null;
  onChange: (asset: MediaAsset | null) => void;
  accept?: Accept;
  label?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3"
      data-testid={id ? `media-picker-${id}` : undefined}
    >
      {value ? (
        <MediaThumb asset={value} className="size-16 shrink-0 rounded-md border" />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted">
          <ImageIcon aria-hidden className="size-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {value ? (
          <>
            <p className="truncate text-sm font-medium">{value.filename}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {value.width && value.height ? `${value.width}×${value.height} · ` : ""}
              {formatBytes(value.size_bytes)}
              <MissingAltBadge asset={value} />
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No {label.toLowerCase()} selected</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label={`${value ? "Change" : "Choose"} ${label.toLowerCase()}`}
        >
          {value ? "Change" : "Choose"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            Remove
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-4xl">
          {open && (
            <PickerBody
              label={label}
              accept={accept}
              initial={value}
              onCancel={() => setOpen(false)}
              onPick={(asset) => {
                onChange(asset);
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PickerBody({
  label,
  accept,
  initial,
  onCancel,
  onPick,
}: {
  label: string;
  accept: Accept;
  initial: MediaAsset | null;
  onCancel: () => void;
  onPick: (asset: MediaAsset) => void;
}) {
  const { can, isSuperAdmin } = usePermissions();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MediaListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(initial);
  const [loading, startLoading] = useTransition();

  const load = useCallback(() => {
    startLoading(async () => {
      const result = await browseMedia({
        folderId,
        query: search,
        type: accept === "image" ? "image" : "all",
        page,
        pageSize: 18,
      });
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else setError(result.error);
    });
  }, [accept, folderId, page, search]);

  useEffect(load, [load]);

  const uploader = useMediaUpload({
    folderId,
    allowSvg: isSuperAdmin,
    onUploaded: (asset) => {
      setSelected(asset);
      load();
    },
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose {label.toLowerCase()}</DialogTitle>
        <DialogDescription>
          Pick a file from the media library{can("media", "create") ? " or upload a new one" : ""}.
        </DialogDescription>
      </DialogHeader>

      <form
        role="search"
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query.trim());
        }}
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by file name or alt text"
          aria-label="Search the media library"
          className="h-10 pl-9"
        />
      </form>

      {!search && (
        <nav aria-label="Folders" className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            className={cn("hover:text-accent", !folderId && "font-medium")}
            onClick={() => {
              setFolderId(null);
              setPage(1);
            }}
          >
            All media
          </button>
          {data?.trail.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
              <button
                type="button"
                className="hover:text-accent"
                onClick={() => {
                  setFolderId(folder.id);
                  setPage(1);
                }}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="min-h-48 flex-1 space-y-3 overflow-y-auto" aria-busy={loading}>
        {can("media", "create") && (
          <>
            <UploadZone
              compact
              accept={uploadAccept(isSuperAdmin, accept === "image")}
              onFiles={(files) => void uploader.upload(files)}
            >
              Drop files here to upload them to this folder.
            </UploadZone>
            <UploadQueue items={uploader.items.filter((i) => i.status !== "done")} />
          </>
        )}
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : data && data.assets.length === 0 && data.folders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {search ? "No files match your search." : "This folder is empty."}
          </p>
        ) : data ? (
          <MediaGrid
            folders={data.folders}
            assets={data.assets}
            view="grid"
            selectedId={selected?.id}
            onOpenFolder={(folder) => {
              setFolderId(folder.id);
              setPage(1);
            }}
            onOpenAsset={setSelected}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
      </div>

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {pages > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pages || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={!selected} onClick={() => selected && onPick(selected)}>
            Use selected {label.toLowerCase()}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
