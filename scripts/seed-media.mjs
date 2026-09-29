// pnpm seed:media: uploads seed/media/* to the media bucket, creates media_assets rows with the
// alt text from seed/media/manifest.json, puts each image into the page section fields listed
// in the manifest (only where the field is still empty), and publishes the pages it changed.
//
// Safe to run twice: each file gets a storage path derived from its name, so an image that is
// already in the library is reused instead of uploaded again.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (read from .env.local if present).

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { imageDimensions } from "../src/core/media/dimensions.ts";
import { MAX_UPLOAD_BYTES, sniffMimeType, UPLOAD_TYPES } from "../src/core/media/upload-rules.ts";

const MEDIA_DIR = path.resolve(import.meta.dirname, "../seed/media");
const BUCKET = "media";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (for example in .env.local).",
  );
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

/** A stable UUID-shaped id for a seed file, so reruns find the same storage object. */
function seedId(file) {
  const hex = createHash("sha256").update(`seed-media:${file}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function ensureAsset(entry) {
  const bytes = new Uint8Array(await readFile(path.join(MEDIA_DIR, entry.file)));
  const mimeType = sniffMimeType(bytes);
  if (!mimeType || mimeType === "image/svg+xml" || mimeType === "application/pdf") {
    throw new Error(`${entry.file}: use a JPEG, PNG, WebP, AVIF, or GIF image.`);
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error(`${entry.file} is larger than 10 MB.`);

  const id = seedId(entry.file);
  const ext = UPLOAD_TYPES[mimeType].ext;
  const { data: existing, error: findError } = await supabase
    .from("media_assets")
    .select("id")
    .like("storage_path", `library/%/${id}.${ext}`)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    console.log(`  = ${entry.file} (already in the library)`);
    return existing.id;
  }

  const now = new Date();
  const storagePath = `library/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const dimensions = imageDimensions(bytes, mimeType);
  const { data: asset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      storage_path: storagePath,
      filename: entry.file,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      alt_text: entry.alt?.trim() || null,
    })
    .select("id")
    .single();
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }
  console.log(`  + ${entry.file}`);
  return asset.id;
}

/** Sets props[field] (a dotted path such as "cards.0.image") when it is empty. */
function fillField(props, field, mediaId) {
  const keys = field.split(".");
  let parent = props;
  for (const key of keys.slice(0, -1)) {
    parent = parent?.[key];
    if (parent === null || typeof parent !== "object") return "missing";
  }
  const last = keys.at(-1);
  if (parent[last]?.mediaId) return parent[last].mediaId === mediaId ? "same" : "kept";
  parent[last] = { mediaId };
  return "filled";
}

async function fillTargets(entry, mediaId, changedPages) {
  for (const target of entry.targets ?? []) {
    const label = `${target.page} › ${target.section}${target.index ? ` #${target.index + 1}` : ""} › ${target.field}`;
    const { data: page } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", target.page)
      .maybeSingle();
    if (!page) {
      console.warn(`    ! ${label}: no page with slug "${target.page}"`);
      continue;
    }
    const { data: sections, error } = await supabase
      .from("page_sections")
      .select("id, props")
      .eq("page_id", page.id)
      .eq("type", target.section)
      .order("sort_order");
    if (error) throw error;
    const section = sections?.[target.index ?? 0];
    if (!section) {
      console.warn(`    ! ${label}: section not found`);
      continue;
    }
    const props = structuredClone(section.props);
    const result = fillField(props, target.field, mediaId);
    if (result === "missing") console.warn(`    ! ${label}: field not found`);
    if (result === "kept") console.log(`    ${label}: already has another image, left as is`);
    if (result !== "filled") continue;
    const { error: updateError } = await supabase
      .from("page_sections")
      .update({ props })
      .eq("id", section.id);
    if (updateError) throw updateError;
    changedPages.set(page.id, target.page);
    console.log(`    -> ${label}`);
  }
}

const manifest = JSON.parse(await readFile(path.join(MEDIA_DIR, "manifest.json"), "utf8"));
const changedPages = new Map();
console.log(`Seeding ${manifest.images.length} images from seed/media/`);
for (const entry of manifest.images) {
  const mediaId = await ensureAsset(entry);
  await fillTargets(entry, mediaId, changedPages);
}
for (const [pageId, slug] of changedPages) {
  const { error } = await supabase.rpc("system_publish_page", { page: pageId });
  if (error) throw error;
  console.log(`Published ${slug}.`);
}
if (changedPages.size === 0) console.log("No image fields needed filling; nothing published.");
console.log(
  "Done. If the site is already running, publish a page in the admin to refresh its cache.",
);
