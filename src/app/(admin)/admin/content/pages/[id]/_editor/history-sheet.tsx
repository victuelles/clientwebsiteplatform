"use client";

import { ExternalLink, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { RevisionSummary } from "./types";

const format = (iso: string) =>
  `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))} UTC`;

export function HistorySheet({
  open,
  onOpenChange,
  pageId,
  revisions,
  canRestore,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  revisions: RevisionSummary[];
  canRestore: boolean;
  onRestore: (revision: RevisionSummary) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
          <SheetDescription>
            Every publish is saved (the last 20). Restoring copies a version into the draft; it is
            not published until you publish.
          </SheetDescription>
        </SheetHeader>
        <ol className="space-y-2 px-4 pb-6" aria-label="Published versions">
          {revisions.length === 0 && (
            <li className="text-sm text-muted-foreground">
              This page hasn&apos;t been published yet.
            </li>
          )}
          {revisions.map((revision, index) => (
            <li key={revision.id} className="rounded-lg border p-3" data-testid="revision">
              <div className="flex items-start gap-2">
                <History aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {format(revision.publishedAt)}
                    {index === 0 && (
                      <span className="ml-2 text-xs font-normal text-success">Live</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {revision.publishedBy ? `by ${revision.publishedBy}` : "by the system"} ·{" "}
                    {revision.sectionCount} sections
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={`/preview/${pageId}?revision=${revision.id}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLink aria-hidden /> Preview
                </Button>
                {canRestore && (
                  <Button variant="outline" size="sm" onClick={() => onRestore(revision)}>
                    Restore to draft
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
