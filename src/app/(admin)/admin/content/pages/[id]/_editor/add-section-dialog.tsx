"use client";

import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SECTION_DEFINITIONS } from "@/core/sections/registry";

import { SectionThumbnail } from "./thumbnails";

export function AddSectionDialog({
  open,
  onOpenChange,
  onAdd,
  afterLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: string) => void;
  afterLabel: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
          <DialogDescription>
            {afterLabel
              ? `It will be added below “${afterLabel}”.`
              : "It will be added at the end of the page."}
          </DialogDescription>
        </DialogHeader>
        <ul
          className="grid flex-1 gap-3 overflow-y-auto p-0.5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Section types"
        >
          {SECTION_DEFINITIONS.map((definition) => (
            <li key={definition.key}>
              <button
                type="button"
                onClick={() => onAdd(definition.key)}
                className="flex h-full w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:border-accent hover:bg-accent/5 focus-visible:border-accent focus-visible:outline-none"
                aria-label={`Add ${definition.label}`}
              >
                <SectionThumbnail type={definition.key} />
                <span className="text-sm font-semibold">{definition.label}</span>
                <span className="text-xs text-muted-foreground">{definition.description}</span>
                {definition.requirement && (
                  <span className="flex gap-1.5 text-xs text-accent">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {definition.requirement.message}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
