"use client";

import { Copy, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { MediaImage } from "@/components/media/media-image";
import { MissingAltBadge } from "@/components/media/media-grid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteMediaAsset, getMediaUsage, updateMediaAsset } from "@/core/media/actions";
import { folderTrailPath } from "@/core/media/folders";
import {
  formatBytes,
  isImage,
  mediaPublicUrl,
  type MediaAsset,
  type MediaFolder,
} from "@/core/media/types";
import type { MediaUsage } from "@/core/media/usage";

const ROOT = "__root";

export function AssetDrawer({
  asset,
  folders,
  canEdit,
  canDelete,
  onClose,
  onChanged,
  onDeleted,
}: {
  asset: MediaAsset | null;
  folders: MediaFolder[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChanged: (asset: MediaAsset) => void;
  onDeleted: () => void;
}) {
  return (
    <Sheet open={asset !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {asset && (
          <AssetDetails
            key={asset.id + asset.updated_at}
            asset={asset}
            folders={folders}
            canEdit={canEdit}
            canDelete={canDelete}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function AssetDetails({
  asset,
  folders,
  canEdit,
  canDelete,
  onChanged,
  onDeleted,
}: {
  asset: MediaAsset;
  folders: MediaFolder[];
  canEdit: boolean;
  canDelete: boolean;
  onChanged: (asset: MediaAsset) => void;
  onDeleted: () => void;
}) {
  const [altText, setAltText] = useState(asset.alt_text ?? "");
  const [caption, setCaption] = useState(asset.caption ?? "");
  const [folderId, setFolderId] = useState(asset.folder_id ?? ROOT);
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [pending, startTransition] = useTransition();
  const url = mediaPublicUrl(asset.storage_path);
  const dirty =
    altText !== (asset.alt_text ?? "") ||
    caption !== (asset.caption ?? "") ||
    folderId !== (asset.folder_id ?? ROOT);

  useEffect(() => {
    let active = true;
    void getMediaUsage({ id: asset.id }).then((result) => {
      if (active) setUsage(result.ok ? result.data : []);
    });
    return () => {
      active = false;
    };
  }, [asset.id]);

  const folderItems = [
    { value: ROOT, label: "All media (no folder)" },
    ...folders.map((f) => ({ value: f.id, label: folderTrailPath(folders, f.id) })),
  ];

  function save() {
    startTransition(async () => {
      const result = await updateMediaAsset({
        id: asset.id,
        altText,
        caption,
        folderId: folderId === ROOT ? null : folderId,
      });
      if (!result.ok) {
        toast.error(
          result.fieldErrors?.altText?.[0] ?? result.fieldErrors?.caption?.[0] ?? result.error,
        );
        return;
      }
      toast.success("File details saved.");
      onChanged(result.data);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMediaAsset({ id: asset.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${asset.filename} was deleted.`);
      onDeleted();
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="pr-8 break-all">{asset.filename}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          {asset.mime_type} · {formatBytes(asset.size_bytes)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          <MissingAltBadge asset={asset} />
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted">
          {isImage(asset) ? (
            <MediaImage asset={asset} fill sizes="400px" className="object-contain" />
          ) : (
            <FileText aria-hidden className="size-12 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="asset-url">File URL</Label>
          <div className="flex gap-2">
            <Input
              id="asset-url"
              readOnly
              value={url}
              className="h-9 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Copy URL"
              onClick={() =>
                void navigator.clipboard.writeText(url).then(() => toast.success("URL copied."))
              }
            >
              <Copy aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Open file"
              nativeButton={false}
              render={<a href={url} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink aria-hidden />
            </Button>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {isImage(asset) && (
            <div className="space-y-2">
              <Label htmlFor="asset-alt">Alt text</Label>
              <textarea
                id="asset-alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                readOnly={!canEdit}
                rows={3}
                maxLength={500}
                placeholder="Describe the image for people who can't see it"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="asset-caption">Caption</Label>
            <Input
              id="asset-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              readOnly={!canEdit}
              maxLength={1000}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-folder">Folder</Label>
            <Select
              items={folderItems}
              value={folderId}
              onValueChange={(v) => setFolderId(String(v))}
              disabled={!canEdit}
            >
              <SelectTrigger id="asset-folder" className="h-10 w-full data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {folderItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canEdit && (
            <Button type="submit" disabled={!dirty || pending} className="w-full">
              Save details
            </Button>
          )}
        </form>

        <section aria-labelledby="usage-heading" className="space-y-2">
          <h3 id="usage-heading" className="text-sm font-semibold">
            Used in
          </h3>
          {usage === null ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : usage.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="asset-usage">
              Not used anywhere yet.
            </p>
          ) : (
            <ul className="space-y-1 text-sm" data-testid="asset-usage">
              {usage.map((u) => (
                <li key={u.label}>
                  {u.href ? (
                    <Link
                      href={u.href}
                      className="underline-offset-4 hover:text-accent hover:underline"
                    >
                      {u.label}
                    </Link>
                  ) : (
                    u.label
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" className="w-full" disabled={pending} />}
            >
              Delete file
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {asset.filename}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The file is removed from the library and from storage. Files that are used
                  somewhere can&apos;t be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  );
}
