"use client";

import { createContext, useContext } from "react";

import type { MediaAsset } from "@/core/media/types";

export type EditorPage = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  published: boolean;
};

export type SectionEditorContextValue = {
  readOnly: boolean;
  pages: EditorPage[];
  media: Record<string, MediaAsset>;
  registerMedia: (asset: MediaAsset) => void;
  modules: Record<string, boolean>;
  feedSources: { value: string; label: string }[];
};

const Ctx = createContext<SectionEditorContextValue | null>(null);

export const SectionEditorProvider = Ctx.Provider;

export function useSectionEditor(): SectionEditorContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSectionEditor() must be used inside <SectionEditorProvider>.");
  return value;
}

/** Errors keyed by dotted path ("cards.0.title"). */
export type FieldErrors = Record<string, string>;

export function childErrors(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  for (const [path, message] of Object.entries(errors)) {
    if (path === prefix) out[""] = message;
    else if (path.startsWith(`${prefix}.`)) out[path.slice(prefix.length + 1)] = message;
  }
  return out;
}
