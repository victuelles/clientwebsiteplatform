import Link from "next/link";

import { signOut } from "@/core/auth/actions";
import { isStaffOrAdminRole } from "@/core/auth/roles";
import { getCurrentProfile } from "@/core/auth/session";

const linkClass =
  "text-xs leading-none font-semibold tracking-widest uppercase transition-colors hover:text-accent";

/** Signed-in / signed-out indicator for the public placeholder header. */
export async function AuthIndicator() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link href="/sign-in" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <nav aria-label="Account" className="flex items-center gap-5">
      {isStaffOrAdminRole(profile.role) && (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      )}
      <Link href="/account" className={linkClass} data-testid="account-link">
        Account
      </Link>
      <form action={signOut} className="flex">
        <button type="submit" className={linkClass}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
