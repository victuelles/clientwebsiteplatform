"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { MediaPicker } from "@/components/media/media-picker";
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
import { Textarea } from "@/components/ui/textarea";
import type { MediaAsset } from "@/core/media/types";
import { slugProblem } from "@/core/pages/reserved-slugs";

import { checkSlug, updatePageSettings } from "../../../actions";
import type { EditorPageMeta } from "./types";

export function PageSettingsDialog({
  open,
  onOpenChange,
  page,
  ogImage,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: EditorPageMeta;
  ogImage: MediaAsset | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(page.seoDescription ?? "");
  const [image, setImage] = useState<MediaAsset | null>(ogImage);
  const [serverCheck, setServerCheck] = useState<{ slug: string; message: string | null } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const localProblem = page.isHome ? null : slugProblem(slug);
  useEffect(() => {
    if (page.isHome || slugProblem(slug) || slug === page.slug) return;
    const timer = setTimeout(() => {
      void checkSlug({ slug, pageId: page.id }).then((r) =>
        setServerCheck({ slug, message: r.ok ? r.data.message : r.error }),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [slug, page.id, page.isHome, page.slug]);
  const slugError = localProblem ?? (serverCheck?.slug === slug ? serverCheck.message : null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updatePageSettings({
        pageId: page.id,
        title,
        slug,
        seoTitle,
        seoDescription,
        ogImageMediaId: image?.id ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Page settings saved.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Page settings</DialogTitle>
            <DialogDescription>These apply immediately, without publishing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="h-10"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-slug">URL</Label>
            <div className="flex items-center rounded-lg border">
              <span className="pl-3 text-sm text-muted-foreground">/</span>
              <input
                id="page-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                maxLength={80}
                disabled={readOnly}
                aria-invalid={Boolean(slugError)}
                aria-describedby="page-slug-help"
                className="h-10 flex-1 bg-transparent px-1 text-sm outline-none"
              />
            </div>
            <p
              id="page-slug-help"
              className={slugError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
            >
              {slugError ??
                (page.isHome
                  ? "The homepage is always shown at /."
                  : "Links to this page keep working if you change it.")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-seo-title">Search title</Label>
            <Input
              id="page-seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={200}
              placeholder={title}
              className="h-10"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-seo-description">Search description</Label>
            <Textarea
              id="page-seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Uses the site's default description when empty."
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Share image</Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{image?.filename ?? "Site default"}</p>
            ) : (
              <MediaPicker
                id="page-og-image"
                label="Share image"
                value={image}
                onChange={setImage}
              />
            )}
          </div>
          {!readOnly && (
            <DialogFooter>
              <Button type="submit" disabled={pending || !title.trim() || Boolean(slugError)}>
                Save settings
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
