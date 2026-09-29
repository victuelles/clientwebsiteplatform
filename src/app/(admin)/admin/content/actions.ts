"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { ActionError, protectedAction, toActionError } from "@/core/access/protected-action";
import { mediaIdsIn } from "@/core/sections/media-ids";
import { MEDIA_TAG, MENUS_TAG, PAGES_TAG, pageTag } from "@/core/pages/tags";
import { slugProblem } from "@/core/pages/reserved-slugs";
import { commonSettingsSchema } from "@/core/sections/common";
import {
  defaultPropsFor,
  defaultSettingsFor,
  getSectionDefinition,
} from "@/core/sections/registry";
import { createClient } from "@/core/supabase/server";

// Content editing. Every action goes through protectedAction with the content permission it
// needs; RLS and the SQL functions enforce the same rules again.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const pageId = z.uuid();
const sectionId = z.uuid();

/** The public site caches pages and menus (menus resolve page links) under these tags. */
function expirePublicPages(id?: string) {
  updateTag(PAGES_TAG);
  updateTag(MENUS_TAG);
  if (id) updateTag(pageTag(id));
}

function refreshEditor(id: string) {
  revalidatePath(`/admin/content/pages/${id}`);
  revalidatePath("/admin/content");
}

async function assertSlugAvailable(supabase: Supabase, slug: string, exceptPageId?: string) {
  const problem = slugProblem(slug);
  if (problem) throw new ActionError(problem);
  let query = supabase.from("pages").select("id").eq("slug", slug);
  if (exceptPageId) query = query.neq("id", exceptPageId);
  const { data } = await query.limit(1);
  if (data && data.length > 0) throw new ActionError(`Another page already uses “/${slug}”.`);
}

async function draftSections(supabase: Supabase, id: string) {
  const { data, error } = await supabase
    .from("page_sections")
    .select("id, type, props, background, padding, anchor_id, is_hidden, sort_order")
    .eq("page_id", id)
    .order("sort_order");
  if (error) throw toActionError(error);
  return data ?? [];
}

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------

export const checkSlug = protectedAction({
  scope: "content",
  action: "view",
  schema: z.object({ slug: z.string().max(100), pageId: pageId.optional() }),
  handler: async ({ input, supabase }) => {
    try {
      await assertSlugAvailable(supabase, input.slug, input.pageId);
      return { ok: true as const, message: null };
    } catch (error) {
      if (error instanceof ActionError) return { ok: false as const, message: error.userMessage };
      throw error;
    }
  },
});

export const createPage = protectedAction({
  scope: "content",
  action: "create",
  schema: z.object({
    title: z.string().trim().min(1, "Enter a title.").max(200),
    slug: z.string().trim().toLowerCase().max(80),
    copyFromPageId: pageId.nullable().default(null),
  }),
  audit: {
    action: "page.created",
    target: (_input, data: { id: string }) => ({ table: "pages", id: data.id }),
    metadata: (input) => ({
      title: input.title,
      slug: input.slug,
      copied_from: input.copyFromPageId,
    }),
  },
  handler: async ({ input, context, supabase }) => {
    await assertSlugAvailable(supabase, input.slug);
    const { data: page, error } = await supabase
      .from("pages")
      .insert({ title: input.title, slug: input.slug, created_by: context.profile!.id })
      .select("id")
      .single();
    if (error) throw toActionError(error);

    if (input.copyFromPageId) {
      const sections = await draftSections(supabase, input.copyFromPageId);
      if (sections.length) {
        const { error: copyError } = await supabase.from("page_sections").insert(
          sections.map((s, index) => ({
            page_id: page.id,
            type: s.type,
            sort_order: index,
            props: s.props,
            background: s.background,
            padding: s.padding,
            anchor_id: s.anchor_id,
            is_hidden: s.is_hidden,
          })),
        );
        if (copyError) throw toActionError(copyError);
      }
    }
    revalidatePath("/admin/content");
    return { id: page.id };
  },
});

export const duplicatePage = protectedAction({
  scope: "content",
  action: "create",
  schema: z.object({ pageId }),
  handler: async ({ input, supabase }) => {
    const { data: source, error } = await supabase
      .from("pages")
      .select("title, slug")
      .eq("id", input.pageId)
      .single();
    if (error) throw toActionError(error);
    let slug = `${source.slug}-copy`.slice(0, 74);
    for (let n = 2; ; n++) {
      const { data } = await supabase.from("pages").select("id").eq("slug", slug).limit(1);
      if (!data?.length) break;
      slug = `${source.slug}-copy-${n}`.slice(0, 80);
    }
    const created = await createPage({
      title: `Copy of ${source.title}`.slice(0, 200),
      slug,
      copyFromPageId: input.pageId,
    });
    if (!created.ok) throw new ActionError(created.error);
    return created.data;
  },
});

export const deletePage = protectedAction({
  scope: "content",
  action: "delete",
  schema: z.object({ pageId }),
  audit: {
    action: "page.deleted",
    target: (input) => ({ table: "pages", id: input.pageId }),
    metadata: (_input, data: { title: string }) => ({ title: data.title }),
  },
  handler: async ({ input, supabase }) => {
    const { data: page } = await supabase
      .from("pages")
      .select("title, is_home")
      .eq("id", input.pageId)
      .single();
    if (page?.is_home)
      throw new ActionError(
        "The homepage can't be deleted. Set another page as the homepage first.",
      );
    const { data, error } = await supabase
      .from("pages")
      .delete()
      .eq("id", input.pageId)
      .select("title");
    if (error) throw toActionError(error);
    if (!data?.length) throw new ActionError("That page no longer exists.");
    expirePublicPages(input.pageId);
    revalidatePath("/admin/content");
    return { title: data[0]!.title };
  },
});

export const setHomePage = protectedAction({
  role: "super_admin",
  schema: z.object({ pageId }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("set_home_page", { page: input.pageId });
    if (error) throw toActionError(error);
    expirePublicPages();
    revalidatePath("/admin/content");
    return { pageId: input.pageId };
  },
});

export const updatePageSettings = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({
    pageId,
    title: z.string().trim().min(1, "Enter a title.").max(200),
    slug: z.string().trim().toLowerCase().max(80),
    seoTitle: z
      .string()
      .trim()
      .max(200)
      .transform((v) => v || null),
    seoDescription: z
      .string()
      .trim()
      .max(300)
      .transform((v) => v || null),
    ogImageMediaId: z.uuid().nullable(),
  }),
  audit: {
    action: "page.settings_updated",
    target: (input) => ({ table: "pages", id: input.pageId }),
    metadata: (input) => ({ title: input.title, slug: input.slug }),
  },
  handler: async ({ input, supabase }) => {
    await assertSlugAvailable(supabase, input.slug, input.pageId);
    const { error } = await supabase
      .from("pages")
      .update({
        title: input.title,
        slug: input.slug,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
        og_image_media_id: input.ogImageMediaId,
      })
      .eq("id", input.pageId);
    if (error) {
      if (error.code === "23505")
        throw new ActionError(`Another page already uses “/${input.slug}”.`);
      throw toActionError(error);
    }
    // Title, slug, and SEO fields are live immediately (they are not part of the draft).
    expirePublicPages(input.pageId);
    refreshEditor(input.pageId);
    return { slug: input.slug };
  },
});

// ---------------------------------------------------------------------------------------------
// Sections (draft)
// ---------------------------------------------------------------------------------------------

export type EditorSection = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  background: string;
  padding: string;
  anchorId: string | null;
  isHidden: boolean;
};

function toEditorSection(row: {
  id: string;
  type: string;
  props: unknown;
  background: string;
  padding: string;
  anchor_id: string | null;
  is_hidden: boolean;
}): EditorSection {
  return {
    id: row.id,
    type: row.type,
    props: (row.props ?? {}) as Record<string, unknown>,
    background: row.background,
    padding: row.padding,
    anchorId: row.anchor_id,
    isHidden: row.is_hidden,
  };
}

/** Inserts `rows` after `afterId` (or at the end) and renumbers the whole page atomically. */
async function insertSectionsAfter(
  supabase: Supabase,
  page: string,
  afterId: string | null,
  row: Omit<EditorSection, "id" | "anchorId"> & { anchorId: string | null },
) {
  const existing = await draftSections(supabase, page);
  const { data, error } = await supabase
    .from("page_sections")
    .insert({
      page_id: page,
      type: row.type,
      sort_order: existing.length ? Math.max(...existing.map((s) => s.sort_order)) + 1 : 0,
      props: row.props as never,
      background: row.background,
      padding: row.padding,
      anchor_id: row.anchorId,
      is_hidden: row.isHidden,
    })
    .select("id, type, props, background, padding, anchor_id, is_hidden")
    .single();
  if (error) throw toActionError(error);

  const ids = existing.map((s) => s.id);
  const after = afterId ? ids.indexOf(afterId) : -1;
  ids.splice(after >= 0 ? after + 1 : ids.length, 0, data.id);
  const { error: orderError } = await supabase.rpc("reorder_sections", { page, ordered_ids: ids });
  if (orderError) throw toActionError(orderError);
  return toEditorSection(data);
}

export const addSection = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId, type: z.string(), afterSectionId: sectionId.nullable() }),
  handler: async ({ input, supabase }) => {
    if (!getSectionDefinition(input.type)) throw new ActionError("Unknown section type.");
    const settings = defaultSettingsFor(input.type);
    const section = await insertSectionsAfter(supabase, input.pageId, input.afterSectionId, {
      type: input.type,
      props: defaultPropsFor(input.type),
      background: settings.background,
      padding: settings.padding,
      anchorId: null,
      isHidden: false,
    });
    refreshEditor(input.pageId);
    return section;
  },
});

export const duplicateSection = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId, sectionId }),
  handler: async ({ input, supabase }) => {
    const { data: source, error } = await supabase
      .from("page_sections")
      .select("id, type, props, background, padding, anchor_id, is_hidden")
      .eq("id", input.sectionId)
      .eq("page_id", input.pageId)
      .single();
    if (error) throw toActionError(error);
    const copy = toEditorSection(source);
    const section = await insertSectionsAfter(supabase, input.pageId, input.sectionId, {
      ...copy,
      anchorId: null,
    });
    refreshEditor(input.pageId);
    return section;
  },
});

export const updateSection = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({
    pageId,
    sectionId,
    props: z.record(z.string(), z.unknown()),
    settings: z.object({
      background: commonSettingsSchema.shape.background,
      padding: commonSettingsSchema.shape.padding,
      anchorId: commonSettingsSchema.shape.anchorId,
      isHidden: z.boolean(),
    }),
  }),
  handler: async ({ input, supabase }) => {
    const { data: row } = await supabase
      .from("page_sections")
      .select("type")
      .eq("id", input.sectionId)
      .eq("page_id", input.pageId)
      .single();
    const definition = row ? getSectionDefinition(row.type) : undefined;
    if (!definition) throw new ActionError("That section no longer exists.");
    if (!definition.backgrounds.includes(input.settings.background))
      throw new ActionError("That background isn't available for this section.");
    // Props are validated here (on save) and again when rendering.
    const parsed = definition.schema.safeParse(input.props);
    if (!parsed.success)
      throw new ActionError(
        `Fix the highlighted fields first: ${parsed.error.issues[0]?.message ?? "invalid value"}.`,
      );

    const { data, error } = await supabase
      .from("page_sections")
      .update({
        props: parsed.data as never,
        background: input.settings.background,
        padding: input.settings.padding,
        anchor_id: input.settings.anchorId,
        is_hidden: input.settings.isHidden,
      })
      .eq("id", input.sectionId)
      .select("updated_at")
      .single();
    if (error) throw toActionError(error);
    // Media usage labels and the preview read fresh data.
    if (mediaIdsIn(parsed.data).size) updateTag(MEDIA_TAG);
    return { updatedAt: data.updated_at };
  },
});

export const deleteSection = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId, sectionId }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase
      .from("page_sections")
      .delete()
      .eq("id", input.sectionId)
      .eq("page_id", input.pageId);
    if (error) throw toActionError(error);
    const remaining = await draftSections(supabase, input.pageId);
    if (remaining.length) {
      const { error: orderError } = await supabase.rpc("reorder_sections", {
        page: input.pageId,
        ordered_ids: remaining.map((s) => s.id),
      });
      if (orderError) throw toActionError(orderError);
    }
    refreshEditor(input.pageId);
    return { sectionId: input.sectionId };
  },
});

export const reorderSections = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId, orderedIds: z.array(sectionId).max(200) }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("reorder_sections", {
      page: input.pageId,
      ordered_ids: input.orderedIds,
    });
    if (error) throw toActionError(error);
    return { count: input.orderedIds.length };
  },
});

// ---------------------------------------------------------------------------------------------
// Publishing and history
// ---------------------------------------------------------------------------------------------

export const publishPage = protectedAction({
  scope: "content",
  action: "publish",
  schema: z.object({ pageId }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("publish_page", { page: input.pageId });
    if (error) throw toActionError(error);
    expirePublicPages(input.pageId);
    refreshEditor(input.pageId);
    return { pageId: input.pageId };
  },
});

export const unpublishPage = protectedAction({
  scope: "content",
  action: "publish",
  schema: z.object({ pageId }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("unpublish_page", { page: input.pageId });
    if (error) throw toActionError(error);
    expirePublicPages(input.pageId);
    refreshEditor(input.pageId);
    return { pageId: input.pageId };
  },
});

export const discardDraft = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("discard_draft", { page: input.pageId });
    if (error) throw toActionError(error);
    refreshEditor(input.pageId);
    return { pageId: input.pageId };
  },
});

export const restoreRevision = protectedAction({
  scope: "content",
  action: "edit",
  schema: z.object({ pageId, revisionId: z.uuid() }),
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.rpc("restore_revision", { revision: input.revisionId });
    if (error) throw toActionError(error);
    refreshEditor(input.pageId);
    return { pageId: input.pageId };
  },
});
