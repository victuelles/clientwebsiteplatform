import type { FieldErrors } from "@/components/section-editor/editor-context";

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "invalid";

export type SectionState = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  background: string;
  padding: string;
  anchorId: string | null;
  isHidden: boolean;
  status: SaveStatus;
  errors: FieldErrors;
  saveError?: string;
};

export type RevisionSummary = {
  id: string;
  publishedAt: string;
  publishedBy: string | null;
  sectionCount: number;
};

export type EditorPageMeta = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageMediaId: string | null;
};
