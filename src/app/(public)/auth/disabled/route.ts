import { redirect } from "next/navigation";

import { signInPath } from "@/core/auth/redirects";
import { getProfileIncludingInactive } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

// Server Components cannot clear cookies, so guards send deactivated users here to be signed out.
export async function GET() {
  const profile = await getProfileIncludingInactive();

  // Only sign out accounts that really are disabled, so this link cannot be abused.
  if (profile && !profile.is_active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(signInPath(null, "account_disabled"));
  }

  redirect("/");
}
