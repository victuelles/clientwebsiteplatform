"use server";

import { revalidatePath } from "next/cache";

import { ActionError, protectedAction } from "@/core/access/protected-action";
import { profileSchema } from "@/core/auth/schemas";

export const updateProfile = protectedAction({
  role: "signed_in",
  schema: profileSchema,
  handler: async ({ input, context, supabase }) => {
    // RLS and column grants limit this to the user's own full_name/avatar_url.
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: input.fullName })
      .eq("id", context.profile!.id);
    if (error) throw new ActionError("Could not save your changes. Please try again.");

    revalidatePath("/", "layout");
    return { message: "Your profile was updated." };
  },
});
