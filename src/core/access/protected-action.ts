import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/core/supabase/server";
import type { Json } from "@/core/supabase/database.types";

import { getAccessContext, type AccessContext } from "./context";
import type { AccessRequirement } from "./decide";
import { DENIED_MESSAGES, GENERIC_ERROR, VALIDATION_ERROR } from "./messages";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Throw from a handler to return a specific, safe message to the user. */
export class ActionError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "ActionError";
  }
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

type AuditConfig<I, T> = {
  action: string;
  /** Skip the entry when this returns false (e.g. nothing changed). */
  when?: (input: I, data: T) => boolean;
  scope?: string;
  target?: (input: I, data: T) => { table: string; id: string };
  metadata?: (input: I, data: T) => Record<string, unknown>;
};

type ProtectedActionConfig<S extends z.ZodType, T> = AccessRequirement & {
  schema: S;
  audit?: AuditConfig<z.output<S>, T>;
  handler: (args: { input: z.output<S>; context: AccessContext; supabase: Supabase }) => Promise<T>;
};

/**
 * Wraps a server action: checks access, validates input, runs the handler, optionally writes an
 * audit entry, and returns a typed result. Never throws to the client and never exposes internal
 * error messages (throw ActionError for a safe message).
 *
 *   export const saveThing = protectedAction({ scope: "content", action: "edit", schema, handler });
 */
export function protectedAction<S extends z.ZodType, T>(
  config: ProtectedActionConfig<S, T>,
): (input: unknown) => Promise<ActionResult<T>> {
  const { schema, audit, handler, ...requirement } = config;

  return async (input: unknown): Promise<ActionResult<T>> => {
    try {
      const context = await getAccessContext();
      const decision = context.check(requirement as AccessRequirement);
      if (decision !== "allowed") return { ok: false, error: DENIED_MESSAGES[decision] };

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[]>;
        return { ok: false, error: VALIDATION_ERROR, fieldErrors };
      }

      const supabase = await createClient();
      const data = await handler({ input: parsed.data, context, supabase });

      if (audit && (audit.when?.(parsed.data, data) ?? true)) {
        const target = audit.target?.(parsed.data, data);
        const { error } = await supabase.rpc("log_audit", {
          action: audit.action,
          scope: audit.scope ?? requirement.scope,
          target_table: target?.table,
          target_id: target?.id,
          metadata: (audit.metadata?.(parsed.data, data) ?? {}) as Json,
        });
        if (error) console.error(`Audit entry "${audit.action}" failed: ${error.message}`);
      }

      return { ok: true, data };
    } catch (error) {
      unstable_rethrow(error); // let redirect() / notFound() from handlers work
      if (error instanceof ActionError) return { ok: false, error: error.userMessage };
      console.error(error);
      return { ok: false, error: GENERIC_ERROR };
    }
  };
}

type DatabaseError = { code?: string; message: string };

/** Error codes whose messages our SQL functions write for humans (see the migrations). */
// 55000 (object_not_in_prerequisite_state): e.g. set_module_enabled naming a blocking module.
const READABLE_DB_CODES = new Set(["42501", "22023", "P0002", "55000"]);

/**
 * Turns an error from one of our SQL functions into an ActionError with its readable message
 * (e.g. "The super admin cannot be deactivated."); anything else stays internal.
 */
export function toActionError(error: DatabaseError): Error {
  if (error.code && READABLE_DB_CODES.has(error.code)) return new ActionError(error.message);
  return new Error(`Database error ${error.code ?? ""}: ${error.message}`);
}
