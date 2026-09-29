import Link from "next/link";

import { signOut } from "@/core/auth/actions";
import { getAccessContext } from "@/core/access/context";

const linkClass =
  "text-xs leading-none font-semibold tracking-widest uppercase transition-colors hover:text-accent";

/** Signed-in / signed-out indicator for the public placeholder header. */
export async function AuthIndicator() {
  const context = await getAccessContext();
  const profile = context.profile?.is_active ? context.profile : null;

  if (!profile) {
    return (
      <Link href="/sign-in" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <nav aria-label="Account" className="flex items-center gap-5">
      {context.check({ role: "staff_or_admin" }) === "allowed" && (
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
