"use server";

import { revalidatePath } from "next/cache";

import { profileSchema, type ActionResult } from "@/core/auth/schemas";
import { getCurrentProfile } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Please sign in again." };

  // RLS and column grants limit this to the user's own full_name/avatar_url.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", profile.id);

  if (error) return { ok: false, error: "Could not save your changes. Please try again." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Your profile was updated." };
}
