"use client";

import { Copy, ExternalLink, Home, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/core/access/permissions-provider";

import { deletePage, duplicatePage, setHomePage } from "../actions";
import { CreatePageDialog } from "./create-page-dialog";

export type PageRow = {
  id: string;
  title: string;
  path: string;
  isHome: boolean;
  published: boolean;
  unpublishedChanges: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

const formatTime = (iso: string) =>
  `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))} UTC`;

export function PagesTable({ rows }: { rows: PageRow[] }) {
  const router = useRouter();
  // UI hiding only; the actions and RLS enforce permissions.
  const { can, isSuperAdmin } = usePermissions();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PageRow | null>(null);
  const [pending, startTransition] = useTransition();

  function run<T>(
    action: () => Promise<{ ok: boolean; error?: string; data?: T }>,
    success: string,
    then?: (data: T) => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      if (then && result.data) then(result.data);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {can("content", "create") && (
        <div className="flex justify-end">
          <Button size="lg" className="h-10 px-4" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New page
          </Button>
        </div>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No pages yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} data-testid={`page-row-${row.path}`}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/content/pages/${row.id}`}
                    className="underline-offset-4 hover:text-accent hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.isHome && (
                    <Badge variant="outline" className="ml-2 gap-1">
                      <Home aria-hidden className="size-3" />
                      Homepage
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.path}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={row.published ? "text-success" : "text-muted-foreground"}
                    >
                      {row.published ? "Published" : "Draft"}
                    </Badge>
                    {row.unpublishedChanges && (
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        Unpublished changes
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTime(row.updatedAt)}
                  {row.updatedBy && <span className="block text-xs">by {row.updatedBy}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${row.title}`}
                          disabled={pending}
                        />
                      }
                    >
                      <MoreHorizontal aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem render={<Link href={`/admin/content/pages/${row.id}`} />}>
                        <Pencil aria-hidden />
                        Open editor
                      </DropdownMenuItem>
                      {row.published && (
                        <DropdownMenuItem
                          render={<a href={row.path} target="_blank" rel="noreferrer" />}
                        >
                          <ExternalLink aria-hidden />
                          View live
                        </DropdownMenuItem>
                      )}
                      {can("content", "create") && (
                        <DropdownMenuItem
                          onClick={() =>
                            run(
                              () => duplicatePage({ pageId: row.id }),
                              `“${row.title}” duplicated.`,
                            )
                          }
                        >
                          <Copy aria-hidden />
                          Duplicate
                        </DropdownMenuItem>
                      )}
                      {isSuperAdmin && !row.isHome && (
                        <DropdownMenuItem
                          disabled={!row.published}
                          onClick={() =>
                            run(
                              () => setHomePage({ pageId: row.id }),
                              `“${row.title}” is now the homepage.`,
                            )
                          }
                        >
                          <Home aria-hidden />
                          {row.published ? "Set as homepage" : "Set as homepage (publish first)"}
                        </DropdownMenuItem>
                      )}
                      {can("content", "delete") && !row.isHome && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row)}>
                            <Trash2 aria-hidden />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreatePageDialog
        open={creating}
        onOpenChange={setCreating}
        pages={rows.map((r) => ({ id: r.id, title: r.title }))}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The page, its draft, and its history are removed
              {deleting?.published ? `, and ${deleting.path} stops working` : ""}. This can&apos;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const row = deleting;
                setDeleting(null);
                if (row) run(() => deletePage({ pageId: row.id }), `“${row.title}” was deleted.`);
              }}
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
