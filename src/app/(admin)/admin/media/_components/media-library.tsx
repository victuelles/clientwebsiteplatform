"use client";

import { ChevronRight, FolderPlus, LayoutGrid, List, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { MediaGrid } from "@/components/media/media-grid";
import { UploadQueue, UploadZone, uploadAccept } from "@/components/media/upload-zone";
import { useMediaUpload } from "@/components/media/use-media-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/core/access/permissions-provider";
import { createMediaFolder, deleteMediaFolder, renameMediaFolder } from "@/core/media/actions";
import type { MediaListResult, MediaTypeFilter } from "@/core/media/queries";
import type { MediaAsset, MediaFolder } from "@/core/media/types";
import { cn } from "@/lib/utils";

import { AssetDrawer } from "./asset-drawer";

type Filters = {
  folderId: string | null;
  query: string;
  type: MediaTypeFilter;
  view: "grid" | "list";
};

const TYPE_ITEMS = [
  { value: "all", label: "All files" },
  { value: "image", label: "Images" },
  { value: "document", label: "Documents" },
];

function href(filters: Filters, page = 1) {
  const params = new URLSearchParams();
  if (filters.folderId) params.set("folder", filters.folderId);
  if (filters.query) params.set("q", filters.query);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.view !== "grid") params.set("view", filters.view);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/media?${query}` : "/admin/media";
}

export function MediaLibrary({ result, filters }: { result: MediaListResult; filters: Filters }) {
  const router = useRouter();
  // UI hiding only: the server actions and RLS enforce these permissions.
  const { can, isSuperAdmin } = usePermissions();
  const canCreate = can("media", "create");
  const canEdit = can("media", "edit");
  const canDelete = can("media", "delete");

  const [query, setQuery] = useState(filters.query);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [folderDialog, setFolderDialog] = useState<
    { mode: "create" } | { mode: "rename"; folder: MediaFolder } | null
  >(null);
  const [folderName, setFolderName] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<MediaFolder | null>(null);

  const uploader = useMediaUpload({
    folderId: filters.folderId,
    allowSvg: isSuperAdmin,
    onUploaded: () => router.refresh(),
  });

  const go = (next: Partial<Filters>, page = 1) => router.push(href({ ...filters, ...next }, page));
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  async function saveFolder() {
    if (!folderDialog) return;
    const res =
      folderDialog.mode === "create"
        ? await createMediaFolder({ name: folderName, parentId: filters.folderId })
        : await renameMediaFolder({ id: folderDialog.folder.id, name: folderName });
    if (!res.ok) {
      toast.error(res.fieldErrors?.name?.[0] ?? res.error);
      return;
    }
    toast.success(folderDialog.mode === "create" ? "Folder created." : "Folder renamed.");
    setFolderDialog(null);
    router.refresh();
  }

  async function removeFolder() {
    if (!deletingFolder) return;
    const res = await deleteMediaFolder({ id: deletingFolder.id });
    setDeletingFolder(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Folder deleted.");
    router.refresh();
  }

  const folderActions =
    canEdit || canDelete
      ? (folder: MediaFolder) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${folder.name}`} />
              }
            >
              <MoreHorizontal aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setFolderName(folder.name);
                    setFolderDialog({ mode: "rename", folder });
                  }}
                >
                  Rename
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onClick={() => setDeletingFolder(folder)}>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      : undefined;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            go({ query: query.trim() });
          }}
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by file name or alt text"
            aria-label="Search media"
            className="h-10 pl-9"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={TYPE_ITEMS}
            value={filters.type}
            onValueChange={(value) => go({ type: value as MediaTypeFilter })}
          >
            <SelectTrigger
              aria-label="Filter by type"
              className="h-10 w-36 data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border" role="group" aria-label="View">
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-10 rounded-none", filters.view === "grid" && "bg-muted")}
              aria-pressed={filters.view === "grid"}
              aria-label="Grid view"
              onClick={() => go({ view: "grid" }, result.page)}
            >
              <LayoutGrid aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-10 rounded-none", filters.view === "list" && "bg-muted")}
              aria-pressed={filters.view === "list"}
              aria-label="List view"
              onClick={() => go({ view: "list" }, result.page)}
            >
              <List aria-hidden />
            </Button>
          </div>
          {canCreate && !filters.query && (
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                setFolderName("");
                setFolderDialog({ mode: "create" });
              }}
            >
              <FolderPlus aria-hidden />
              New folder
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav aria-label="Folders" className="flex flex-wrap items-center gap-1 text-sm">
        {filters.query ? (
          <span className="text-muted-foreground">
            Results for &ldquo;{filters.query}&rdquo; in all folders ·{" "}
            <Link
              href={href({ ...filters, query: "" })}
              className="text-foreground underline-offset-4 hover:underline"
            >
              Clear search
            </Link>
          </span>
        ) : (
          <>
            <Link
              href={href({ ...filters, folderId: null })}
              className={cn("hover:text-accent", !filters.folderId && "font-medium")}
            >
              All media
            </Link>
            {result.trail.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
                {index === result.trail.length - 1 ? (
                  <span className="font-medium" aria-current="page">
                    {folder.name}
                  </span>
                ) : (
                  <Link
                    href={href({ ...filters, folderId: folder.id })}
                    className="hover:text-accent"
                  >
                    {folder.name}
                  </Link>
                )}
              </span>
            ))}
          </>
        )}
      </nav>

      {canCreate && (
        <div className="space-y-3">
          <UploadZone
            compact
            accept={uploadAccept(isSuperAdmin)}
            onFiles={(files) => void uploader.upload(files)}
          >
            Drag files here to upload
            {result.trail.length ? ` to “${result.trail.at(-1)!.name}”` : ""}. JPEG, PNG, WebP,
            AVIF, GIF, or PDF up to 10 MB
            {isSuperAdmin ? " (SVG allowed for you)" : ""}.
          </UploadZone>
          <UploadQueue items={uploader.items} />
          {uploader.items.length > 0 && !uploader.busy && (
            <Button variant="ghost" size="sm" onClick={uploader.clearFinished}>
              Clear finished uploads
            </Button>
          )}
        </div>
      )}

      {result.folders.length === 0 && result.assets.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center text-muted-foreground">
          {filters.query ? "No files match your search." : "This folder is empty."}
        </div>
      ) : (
        <MediaGrid
          folders={result.folders}
          assets={result.assets}
          view={filters.view}
          selectedId={selected?.id}
          onOpenFolder={(folder) => go({ folderId: folder.id, query: "" })}
          onOpenAsset={setSelected}
          folderActions={folderActions}
        />
      )}

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span data-testid="media-count">
          {result.total} {result.total === 1 ? "file" : "files"}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => go({}, result.page - 1)}
            >
              Previous
            </Button>
            <span className="tabular-nums">
              Page {result.page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page >= pages}
              onClick={() => go({}, result.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <AssetDrawer
        asset={selected}
        folders={result.allFolders}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setSelected(null)}
        onChanged={(asset) => {
          setSelected(asset);
          router.refresh();
        }}
        onDeleted={() => {
          setSelected(null);
          router.refresh();
        }}
      />

      <Dialog open={folderDialog !== null} onOpenChange={(open) => !open && setFolderDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveFolder();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {folderDialog?.mode === "rename" ? "Rename folder" : "New folder"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!folderName.trim()}>
                {folderDialog?.mode === "rename" ? "Rename" : "Create folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingFolder !== null}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deletingFolder?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Only empty folders can be deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void removeFolder()}>
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
