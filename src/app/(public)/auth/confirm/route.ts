import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { signInPath } from "@/core/auth/redirects";
import { finishSignIn } from "@/core/auth/sign-in";
import { createClient } from "@/core/supabase/server";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Verifies the token_hash from email links (confirmation, magic link, password reset, email
 * change), which signs the user in, then redirects. See supabase/templates/.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error && data.user) {
      if (type === "recovery") redirect("/reset-password");
      if (type === "invite") redirect("/auth/set-password");
      redirect(await finishSignIn(supabase, data.user.id, searchParams.get("next")));
    }
  }

  redirect(signInPath(null, "link_invalid"));
}
