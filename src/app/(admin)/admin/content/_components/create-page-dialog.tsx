"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify, slugProblem } from "@/core/pages/reserved-slugs";

import { checkSlug, createPage } from "../actions";

const BLANK = "__blank";

export function CreatePageDialog({
  open,
  onOpenChange,
  pages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [template, setTemplate] = useState(BLANK);
  const [serverCheck, setServerCheck] = useState<{ slug: string; message: string | null } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const effectiveSlug = slugEdited ? slug : slugify(title);

  // Live validation: format and reserved words locally (derived), uniqueness on the server.
  const localProblem = title || slugEdited ? slugProblem(effectiveSlug) : null;
  useEffect(() => {
    if (!title && !slugEdited) return;
    if (slugProblem(effectiveSlug)) return;
    const timer = setTimeout(() => {
      void checkSlug({ slug: effectiveSlug }).then((r) =>
        setServerCheck({ slug: effectiveSlug, message: r.ok ? r.data.message : r.error }),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [effectiveSlug, slugEdited, title]);
  const slugError =
    localProblem ?? (serverCheck?.slug === effectiveSlug ? serverCheck.message : null);

  function reset() {
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setTemplate(BLANK);
    setServerCheck(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createPage({
        title,
        slug: effectiveSlug,
        copyFromPageId: template === BLANK ? null : template,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Page created.");
      onOpenChange(false);
      reset();
      router.push(`/admin/content/pages/${result.data.id}`);
    });
  }

  const templateItems = [
    { value: BLANK, label: "Blank page" },
    ...pages.map((p) => ({ value: p.id, label: `Copy of “${p.title}”` })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
            <DialogDescription>
              It starts as a draft; nothing is public until you publish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-page-title">Title</Label>
            <Input
              id="new-page-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="h-10"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-page-slug">URL</Label>
            <div className="flex items-center rounded-lg border focus-within:border-ring">
              <span className="pl-3 text-sm text-muted-foreground">/</span>
              <input
                id="new-page-slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                maxLength={80}
                aria-invalid={Boolean(slugError)}
                aria-describedby="new-page-slug-help"
                className="h-10 flex-1 bg-transparent px-1 text-sm outline-none"
              />
            </div>
            <p
              id="new-page-slug-help"
              className={slugError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
            >
              {slugError ?? "Lowercase letters, numbers, and hyphens."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-page-template">Start from</Label>
            <Select
              items={templateItems}
              value={template}
              onValueChange={(v) => setTemplate(String(v))}
            >
              <SelectTrigger
                id="new-page-template"
                className="h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templateItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !title.trim() || Boolean(slugError)}>
              Create page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
