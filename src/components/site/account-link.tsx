import Link from "next/link";

import { getAccessContext } from "@/core/access/context";
import { cn } from "@/lib/utils";

/** Sign in / Account / Admin links, depending on who is signed in. */
export async function AccountLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const context = await getAccessContext();
  const signedIn = context.check({ role: "signed_in" }) === "allowed";
  const admin = context.check({ role: "staff_or_admin" }) === "allowed";
  const link = cn("transition-colors hover:text-accent", linkClassName);

  return (
    <span className={cn("flex items-center gap-4", className)}>
      {!signedIn ? (
        <Link href="/sign-in" className={link}>
          Sign in
        </Link>
      ) : (
        <>
          {admin && (
            <Link href="/admin" className={link}>
              Admin
            </Link>
          )}
          <Link href="/account" className={link} data-testid="account-link">
            Account
          </Link>
        </>
      )}
    </span>
  );
}
