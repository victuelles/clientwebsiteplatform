import "server-only";

import type { NextRequest } from "next/server";

import { env } from "@/core/env";

import { getAccessContext, type AccessContext } from "./context";
import type { AccessDecision, AccessRequirement } from "./decide";
import { DENIED_MESSAGES, GENERIC_ERROR } from "./messages";
import { isAllowedOrigin, isMutatingMethod } from "./origin";

const STATUS: Record<Exclude<AccessDecision, "allowed">, number> = {
  unauthenticated: 401,
  inactive: 401,
  forbidden: 403,
  module_disabled: 404,
};

function json(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps a route handler: rejects mutating requests from another origin (403), then answers
 * 401/403/404 JSON when access is denied, and hides unexpected errors behind a generic 500.
 *
 *   export const POST = protectedRoute({ scope: "shop", action: "edit" }, async (request) => ...);
 */
export function protectedRoute<RouteContext>(
  requirement: AccessRequirement,
  handler: (
    request: NextRequest,
    args: { context: AccessContext; route: RouteContext },
  ) => Promise<Response>,
) {
  return async (request: NextRequest, route: RouteContext): Promise<Response> => {
    try {
      if (
        isMutatingMethod(request.method) &&
        !isAllowedOrigin(request.headers.get("origin"), env.NEXT_PUBLIC_SITE_URL)
      ) {
        return json(403, "Invalid request origin.");
      }

      const context = await getAccessContext();
      const decision = context.check(requirement);
      if (decision !== "allowed") return json(STATUS[decision], DENIED_MESSAGES[decision]);

      return await handler(request, { context, route });
    } catch (error) {
      console.error(error);
      return json(500, GENERIC_ERROR);
    }
  };
}
