import { redirect } from "next/navigation";

import { getAccessContext } from "@/core/access/context";
import { signInPath } from "@/core/auth/redirects";
import { createClient } from "@/core/supabase/server";

// Server Components cannot clear cookies, so guards send deactivated users here to be signed out.
export async function GET() {
  const context = await getAccessContext();

  // Only sign out accounts that really are disabled, so this link cannot be abused.
  if (context.check({ role: "signed_in" }) === "inactive") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(signInPath(null, "account_disabled"));
  }

  redirect("/");
}
