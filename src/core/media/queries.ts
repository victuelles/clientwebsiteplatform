import "server-only";

import { z } from "zod";

import type { createClient } from "@/core/supabase/server";

import { MEDIA_ASSET_COLUMNS, type MediaAsset, type MediaFolder } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const MEDIA_TYPE_FILTERS = ["all", "image", "document"] as const;
export type MediaTypeFilter = (typeof MEDIA_TYPE_FILTERS)[number];

export const mediaListSchema = z.object({
  folderId: z.uuid().nullable().default(null),
  query: z.string().trim().max(100).default(""),
  type: z.enum(MEDIA_TYPE_FILTERS).default("all"),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(60).default(24),
});

export type MediaListInput = z.input<typeof mediaListSchema>;

export type MediaListResult = {
  assets: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
  folders: MediaFolder[];
  /** Every folder (small), for breadcrumbs and "move to folder". */
  allFolders: MediaFolder[];
  trail: MediaFolder[];
};

/** Strips characters that have meaning in PostgREST filters or LIKE patterns. */
function searchTerm(query: string) {
  return query
    .replace(/[%_*,().\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function folderTrail(folders: MediaFolder[], folderId: string | null): MediaFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: MediaFolder[] = [];
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && trail.length < 50) {
    trail.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return trail;
}

/**
 * One page of the library. Searching looks across all folders; otherwise it lists the current
 * folder. Runs with the caller's client, so RLS applies.
 */
export async function listMediaAssets(
  supabase: Supabase,
  raw: MediaListInput,
): Promise<MediaListResult> {
  const input = mediaListSchema.parse(raw);
  const term = searchTerm(input.query);

  let query = supabase
    .from("media_assets")
    .select(MEDIA_ASSET_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (term) query = query.or(`filename.ilike.*${term}*,alt_text.ilike.*${term}*`);
  else query = input.folderId ? query.eq("folder_id", input.folderId) : query.is("folder_id", null);

  if (input.type === "image") query = query.like("mime_type", "image/%");
  if (input.type === "document") query = query.eq("mime_type", "application/pdf");

  const from = (input.page - 1) * input.pageSize;
  const [assetsResult, foldersResult] = await Promise.all([
    query.range(from, from + input.pageSize - 1),
    supabase.from("media_folders").select("id, name, parent_id").order("name"),
  ]);
  if (assetsResult.error) throw new Error(`Could not load media: ${assetsResult.error.message}`);
  if (foldersResult.error)
    throw new Error(`Could not load folders: ${foldersResult.error.message}`);

  const allFolders = foldersResult.data ?? [];
  return {
    assets: assetsResult.data ?? [],
    total: assetsResult.count ?? 0,
    page: input.page,
    pageSize: input.pageSize,
    folders: term ? [] : allFolders.filter((f) => f.parent_id === input.folderId),
    allFolders,
    trail: folderTrail(allFolders, input.folderId),
  };
}
