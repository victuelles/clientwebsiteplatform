import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { signInPath } from "@/core/auth/redirects";
import { finishSignIn } from "@/core/auth/sign-in";
import { createClient } from "@/core/supabase/server";

/**
 * PKCE code exchange. Used when a hosted project still has the default email templates
 * ({{ .ConfirmationURL }}), and for future OAuth providers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      redirect(await finishSignIn(supabase, data.user.id, searchParams.get("next")));
    }
  }

  redirect(signInPath(null, "link_invalid"));
}
