export type BootstrapInput = {
  /** SUPER_ADMIN_EMAIL from env. */
  configuredEmail: string | null | undefined;
  userEmail: string | null | undefined;
  emailConfirmed: boolean;
  superAdminExists: boolean;
};

/**
 * Pure decision: should this signed-in user be promoted to super admin?
 * All must hold: SUPER_ADMIN_EMAIL is set and matches (case-insensitive), the email is confirmed,
 * and no super admin exists yet. The database function re-checks everything.
 */
export function shouldBootstrapSuperAdmin(input: BootstrapInput): boolean {
  const configured = input.configuredEmail?.trim().toLowerCase();
  const email = input.userEmail?.trim().toLowerCase();
  if (!configured || !email) return false;
  return configured === email && input.emailConfirmed && !input.superAdminExists;
}
