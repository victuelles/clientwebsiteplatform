"use server";

import { revalidatePath } from "next/cache";

import { ActionError, protectedAction, toActionError } from "@/core/access/protected-action";
import { env } from "@/core/env";
import { createAdminClient } from "@/core/supabase/admin";

import {
  inviteStaffSchema,
  staffActiveSchema,
  staffIdSchema,
  staffPermissionsSchema,
} from "./schemas";

// Super admin only. Every change also goes through a SQL function that re-checks the caller
// and writes the audit entry (set_user_role, set_user_active, set_staff_permissions).

const SET_PASSWORD_URL = () => new URL("/auth/set-password", env.NEXT_PUBLIC_SITE_URL).toString();

function refreshStaff(userId?: string) {
  revalidatePath("/admin/staff");
  if (userId) revalidatePath(`/admin/staff/${userId}`);
}

function assertNotSelf(userId: string, selfId: string | undefined) {
  if (userId === selfId) throw new ActionError("You can't change your own account here.");
}

async function sendInvite(email: string, fullName?: string | null) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: fullName ? { full_name: fullName } : undefined,
    redirectTo: SET_PASSWORD_URL(),
  });
  if (error || !data.user) {
    if (error?.status === 429) {
      throw new ActionError(
        "Too many emails were sent recently. Please try again in a few minutes.",
      );
    }
    throw new Error(`Invite failed: ${error?.message ?? "no user returned"}`);
  }
  return data.user;
}

export type InviteResult =
  { kind: "invited"; userId: string } | { kind: "existing_user"; userId: string; name: string };

/** Invites a new staff member, or reports that the email already belongs to a registered user. */
export const inviteStaff = protectedAction({
  role: "super_admin",
  schema: inviteStaffSchema,
  audit: {
    action: "staff.invited",
    scope: "users",
    when: (_input, data: InviteResult) => data.kind === "invited",
    target: (_input, data) => ({ table: "profiles", id: data.userId }),
    metadata: (input) => ({ email: input.email }),
  },
  handler: async ({ input, supabase }): Promise<InviteResult> => {
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("email", input.email)
      .maybeSingle();
    if (lookupError) throw toActionError(lookupError);

    if (existing) {
      // Inspects the invitee's account, not the caller's access (already checked above).
      if (existing.role === "super_admin")
        throw new ActionError("That is the super admin's account.");
      if (existing.role === "staff")
        throw new ActionError("That person is already a staff member.");
      return {
        kind: "existing_user",
        userId: existing.id,
        name: existing.full_name ?? existing.email,
      };
    }

    const user = await sendInvite(input.email, input.fullName);
    const { error } = await supabase.rpc("set_user_role", {
      target_user: user.id,
      new_role: "staff",
    });
    if (error) throw toActionError(error);

    refreshStaff();
    return { kind: "invited", userId: user.id };
  },
});

/** Promotes an existing registered user to staff (the "offer to promote" path of the invite). */
export const promoteToStaff = protectedAction({
  role: "super_admin",
  schema: staffIdSchema,
  handler: async ({ input, context, supabase }) => {
    assertNotSelf(input.userId, context.profile?.id);
    const { error } = await supabase.rpc("set_user_role", {
      target_user: input.userId,
      new_role: "staff",
    });
    if (error) throw toActionError(error);
    refreshStaff(input.userId);
    return { userId: input.userId };
  },
});

/** Replaces the whole permission matrix for a staff member. */
export const saveStaffPermissions = protectedAction({
  role: "super_admin",
  schema: staffPermissionsSchema,
  handler: async ({ input, context, supabase }) => {
    assertNotSelf(input.userId, context.profile?.id);
    const { error } = await supabase.rpc("set_staff_permissions", {
      target_user: input.userId,
      permissions: input.permissions,
    });
    if (error) throw toActionError(error);
    refreshStaff(input.userId);
    return { count: input.permissions.length };
  },
});

/** Deactivates or reactivates a staff member. Deactivated users are signed out on their next request. */
export const setStaffActive = protectedAction({
  role: "super_admin",
  schema: staffActiveSchema,
  handler: async ({ input, context, supabase }) => {
    assertNotSelf(input.userId, context.profile?.id);
    const { error } = await supabase.rpc("set_user_active", {
      target_user: input.userId,
      active: input.active,
    });
    if (error) throw toActionError(error);
    refreshStaff(input.userId);
    return { active: input.active };
  },
});

/** Demotes a staff member to a regular user; the database removes all of their permissions. */
export const demoteStaff = protectedAction({
  role: "super_admin",
  schema: staffIdSchema,
  handler: async ({ input, context, supabase }) => {
    assertNotSelf(input.userId, context.profile?.id);
    const { error } = await supabase.rpc("set_user_role", {
      target_user: input.userId,
      new_role: "user",
    });
    if (error) throw toActionError(error);
    refreshStaff(input.userId);
    return { userId: input.userId };
  },
});

/** Sends the invitation email again to a staff member who has not accepted yet. */
export const resendInvite = protectedAction({
  role: "super_admin",
  schema: staffIdSchema,
  audit: {
    action: "staff.invite_resent",
    scope: "users",
    target: (input) => ({ table: "profiles", id: input.userId }),
  },
  handler: async ({ input, supabase }) => {
    const { data, error } = await supabase.rpc("admin_list_staff", { target_user: input.userId });
    if (error) throw toActionError(error);
    const staff = data?.[0];
    if (!staff) throw new ActionError("That staff member no longer exists.");
    if (staff.email_confirmed_at) throw new ActionError("This invitation was already accepted.");

    await sendInvite(staff.email, staff.full_name);
    return { email: staff.email };
  },
});
