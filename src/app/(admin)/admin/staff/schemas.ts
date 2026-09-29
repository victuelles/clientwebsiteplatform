import { z } from "zod";

import { ACTIONS, SCOPES } from "@/core/access/scopes";
import { emailSchema, fullNameSchema } from "@/core/auth/schemas";
import { actionsForScope } from "@/core/modules/registry";

const scopeKeys = SCOPES.map((scope) => scope.key) as [string, ...string[]];

export const inviteStaffSchema = z.object({ fullName: fullNameSchema, email: emailSchema });
export type InviteStaffValues = z.infer<typeof inviteStaffSchema>;

export const staffIdSchema = z.object({ userId: z.uuid() });

export const staffPermissionsSchema = z.object({
  userId: z.uuid(),
  permissions: z
    .array(
      z.object({
        scope: z.enum(scopeKeys),
        action: z.enum(ACTIONS as unknown as [string, ...string[]]),
      }),
    )
    .refine(
      (permissions) =>
        permissions.every((p) =>
          (actionsForScope(p.scope, ACTIONS) as readonly string[]).includes(p.action),
        ),
      "A module permission uses an action that module doesn't have.",
    )
    .max(SCOPES.length * ACTIONS.length),
});

export const staffActiveSchema = z.object({ userId: z.uuid(), active: z.boolean() });
