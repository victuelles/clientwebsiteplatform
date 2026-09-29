"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import type { AccessContext } from "@/core/access/context";
import { ActionError, protectedAction, toActionError } from "@/core/access/protected-action";
import { SITE_SETTINGS_TAG } from "@/core/settings/get-settings";
import { createAdminClient } from "@/core/supabase/admin";

import { imageDimensions } from "./dimensions";
import { listMediaAssets, mediaListSchema } from "./queries";
import { sanitizeSvg } from "./sanitize-svg";
import { MEDIA_ASSET_COLUMNS, MEDIA_BUCKET, type MediaAsset } from "./types";
import {
  isLibraryStoragePath,
  MAX_UPLOAD_BYTES,
  sniffMimeType,
  storagePathFor,
  UPLOAD_TYPES,
  validateUpload,
} from "./upload-rules";
import { describeUsage, type MediaUsage } from "./usage";

// Every media action goes through protectedAction with the matching media permission; storage
// and table RLS enforce the same rules again.

const canUseSvg = (context: AccessContext) => context.check({ role: "super_admin" }) === "allowed";

const folderIdSchema = z.uuid().nullable();

// ---------------------------------------------------------------------------------------------
// Upload: requestUpload -> browser PUTs to the signed URL -> confirmUpload
// ---------------------------------------------------------------------------------------------

export const requestUpload = protectedAction({
  scope: "media",
  action: "create",
  schema: z.object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().max(100),
    size: z.number().int().nonnegative(),
  }),
  handler: async ({ input, context, supabase }) => {
    const check = validateUpload(input, { allowSvg: canUseSvg(context) });
    if (!check.ok) throw new ActionError(check.error);

    const path = storagePathFor(check.mimeType);
    // Created with the user's session: storage RLS re-checks can('media', 'create').
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Could not sign upload: ${error?.message}`);
    return { path, signedUrl: data.signedUrl, mimeType: check.mimeType };
  },
});

async function removeObject(path: string) {
  // Cleanup after a failed confirmation. The admin client is used because the uploader may
  // have 'create' but not 'delete'; the path was issued to this upload moments ago.
  const { error } = await createAdminClient().storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.error(`Could not remove orphaned upload ${path}: ${error.message}`);
}

export const confirmUpload = protectedAction({
  scope: "media",
  action: "create",
  schema: z.object({
    path: z.string().refine(isLibraryStoragePath, "Invalid upload path."),
    filename: z.string().trim().min(1).max(255),
    folderId: folderIdSchema,
  }),
  handler: async ({ input, context, supabase }): Promise<MediaAsset> => {
    const storage = supabase.storage.from(MEDIA_BUCKET);
    try {
      const { data: blob, error: downloadError } = await storage.download(input.path);
      if (downloadError || !blob)
        throw new ActionError("The upload could not be found. Please try again.");

      let bytes = new Uint8Array(await blob.arrayBuffer());
      const sniffed = sniffMimeType(bytes);
      const expectedExt = input.path.split(".").pop();
      if (!sniffed || UPLOAD_TYPES[sniffed].ext !== expectedExt) {
        throw new ActionError(`${input.filename}: the file contents don't match its type.`);
      }
      const check = validateUpload(
        { mimeType: sniffed, size: bytes.byteLength, filename: input.filename },
        { allowSvg: canUseSvg(context) },
      );
      if (!check.ok) throw new ActionError(check.error);
      if (bytes.byteLength > MAX_UPLOAD_BYTES)
        throw new ActionError(`${input.filename} is larger than 10 MB.`);

      if (sniffed === "image/svg+xml") {
        const clean = sanitizeSvg(new TextDecoder().decode(bytes));
        if (!clean.trim())
          throw new ActionError(`${input.filename}: this SVG has no safe content.`);
        bytes = new TextEncoder().encode(clean);
        const { error: replaceError } = await storage.update(input.path, bytes, {
          contentType: sniffed,
          upsert: true,
        });
        if (replaceError) throw new Error(`Could not store sanitized SVG: ${replaceError.message}`);
      }

      const dimensions = imageDimensions(bytes, sniffed);
      const { data: asset, error: insertError } = await supabase
        .from("media_assets")
        .insert({
          storage_path: input.path,
          filename: input.filename,
          mime_type: sniffed,
          size_bytes: bytes.byteLength,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          folder_id: input.folderId,
          uploaded_by: context.profile!.id,
        })
        .select(MEDIA_ASSET_COLUMNS)
        .single();
      if (insertError) {
        if (insertError.code === "23505") throw new ActionError("This upload was already saved.");
        throw toActionError(insertError);
      }
      return asset;
    } catch (error) {
      await removeObject(input.path);
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------------------------
// Browse (used by the media picker), edit, usage, delete
// ---------------------------------------------------------------------------------------------

export const browseMedia = protectedAction({
  scope: "media",
  action: "view",
  schema: mediaListSchema,
  handler: async ({ input, supabase }) => listMediaAssets(supabase, input),
});

export const updateMediaAsset = protectedAction({
  scope: "media",
  action: "edit",
  schema: z.object({
    id: z.uuid(),
    altText: z.string().trim().max(500, "Use at most 500 characters."),
    caption: z.string().trim().max(1000, "Use at most 1000 characters."),
    folderId: folderIdSchema,
  }),
  handler: async ({ input, supabase }): Promise<MediaAsset> => {
    const { data, error } = await supabase
      .from("media_assets")
      .update({
        alt_text: input.altText || null,
        caption: input.caption || null,
        folder_id: input.folderId,
      })
      .eq("id", input.id)
      .select(MEDIA_ASSET_COLUMNS)
      .maybeSingle();
    if (error) throw toActionError(error);
    if (!data) throw new ActionError("That file no longer exists.");
    // Alt text of the logo etc. is part of the cached site chrome.
    updateTag(SITE_SETTINGS_TAG);
    return data;
  },
});

export const getMediaUsage = protectedAction({
  scope: "media",
  action: "view",
  schema: z.object({ id: z.uuid() }),
  handler: async ({ input, supabase }): Promise<MediaUsage[]> => {
    const { data, error } = await supabase
      .from("media_references")
      .select("entity_table, field")
      .eq("media_id", input.id);
    if (error) throw toActionError(error);
    return (data ?? []).map(describeUsage);
  },
});

export const deleteMediaAsset = protectedAction({
  scope: "media",
  action: "delete",
  schema: z.object({ id: z.uuid() }),
  audit: {
    action: "media.deleted",
    target: (input) => ({ table: "media_assets", id: input.id }),
    metadata: (_input, data: { filename: string }) => ({ filename: data.filename }),
  },
  handler: async ({ input, supabase }) => {
    const { data: references } = await supabase
      .from("media_references")
      .select("entity_table, field")
      .eq("media_id", input.id);
    if (references && references.length > 0) {
      const places = references.map((r) => describeUsage(r).label).join(", ");
      throw new ActionError(`This file is used in: ${places}. Remove it there first.`);
    }

    const { data: asset, error } = await supabase
      .from("media_assets")
      .delete()
      .eq("id", input.id)
      .select("storage_path, filename")
      .maybeSingle();
    if (error) {
      if (error.code === "23503")
        throw new ActionError("This file is in use and can't be deleted.");
      throw toActionError(error);
    }
    if (!asset) throw new ActionError("That file no longer exists.");

    const { error: storageError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([asset.storage_path]);
    if (storageError)
      console.error(`Deleted media row but not ${asset.storage_path}: ${storageError.message}`);
    return { filename: asset.filename };
  },
});

// ---------------------------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------------------------

const folderName = z
  .string()
  .trim()
  .min(1, "Enter a folder name.")
  .max(100, "Use at most 100 characters.");

function folderError(error: { code?: string; message: string }): Error {
  if (error.code === "23505")
    return new ActionError("A folder with that name already exists here.");
  if (error.code === "23503") return new ActionError("Only empty folders can be deleted.");
  return toActionError(error);
}

export const createMediaFolder = protectedAction({
  scope: "media",
  action: "create",
  schema: z.object({ name: folderName, parentId: folderIdSchema }),
  handler: async ({ input, context, supabase }) => {
    const { data, error } = await supabase
      .from("media_folders")
      .insert({ name: input.name, parent_id: input.parentId, created_by: context.profile!.id })
      .select("id, name, parent_id")
      .single();
    if (error) throw folderError(error);
    return data;
  },
});

export const renameMediaFolder = protectedAction({
  scope: "media",
  action: "edit",
  schema: z.object({ id: z.uuid(), name: folderName }),
  handler: async ({ input, supabase }) => {
    const { data, error } = await supabase
      .from("media_folders")
      .update({ name: input.name })
      .eq("id", input.id)
      .select("id, name, parent_id")
      .maybeSingle();
    if (error) throw folderError(error);
    if (!data) throw new ActionError("That folder no longer exists.");
    return data;
  },
});

export const deleteMediaFolder = protectedAction({
  scope: "media",
  action: "delete",
  schema: z.object({ id: z.uuid() }),
  handler: async ({ input, supabase }) => {
    const [{ count: files }, { count: folders }] = await Promise.all([
      supabase
        .from("media_assets")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", input.id),
      supabase
        .from("media_folders")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", input.id),
    ]);
    if ((files ?? 0) > 0 || (folders ?? 0) > 0)
      throw new ActionError("Only empty folders can be deleted.");

    const { data, error } = await supabase
      .from("media_folders")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) throw folderError(error);
    if (!data?.length) throw new ActionError("That folder no longer exists.");
    return { id: input.id };
  },
});
