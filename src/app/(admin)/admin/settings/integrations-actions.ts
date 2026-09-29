"use server";

import { z } from "zod";

import { ActionError, protectedAction } from "@/core/access/protected-action";
import { getIntegrationDetails } from "@/core/env";
import { testIntegration, type TestResult } from "@/core/integrations/test-connection";

export const testIntegrationConnection = protectedAction({
  role: "super_admin",
  schema: z.object({ integration: z.enum(["stripe", "resend", "mux"]) }),
  audit: {
    action: "integration.tested",
    scope: "settings",
    metadata: (input, data: TestResult) => ({ integration: input.integration, ok: data.ok }),
  },
  handler: async ({ input, context }) => {
    if (!getIntegrationDetails()[input.integration].configured) {
      throw new ActionError("Add the missing environment variables first.");
    }
    return testIntegration(input.integration, context.profile!.email);
  },
});
