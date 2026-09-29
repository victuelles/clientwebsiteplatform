import type { Metadata } from "next";
import { z } from "zod";

import { requireAccess } from "@/core/access/guard";
import { listMediaAssets, MEDIA_TYPE_FILTERS } from "@/core/media/queries";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../_shell/page-header";
import { MediaLibrary } from "./_components/media-library";

export const metadata: Metadata = { title: "Media" };

const paramsSchema = z.object({
  folder: z.uuid().optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  type: z.enum(MEDIA_TYPE_FILTERS).optional().catch(undefined),
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export default async function MediaPage(props: PageProps<"/admin/media">) {
  await requireAccess({ scope: "media", action: "view" });
  const raw = await props.searchParams;
  const params = paramsSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ),
  );

  const supabase = await createClient();
  const result = await listMediaAssets(supabase, {
    folderId: params.folder ?? null,
    query: params.q ?? "",
    type: params.type ?? "all",
    page: params.page ?? 1,
  });

  return (
    <>
      <AdminPageHeader
        title="Media"
        breadcrumbs={[{ label: "Media" }]}
        description="Images and files used across the site. Add alt text so everyone can understand your images."
      />
      <MediaLibrary
        result={result}
        filters={{
          folderId: params.folder ?? null,
          query: params.q ?? "",
          type: params.type ?? "all",
          view: params.view ?? "grid",
        }}
      />
    </>
  );
}
