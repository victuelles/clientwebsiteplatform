import type { z } from "zod";

import type { FieldErrors } from "./editor-context";

/** Zod issues as { "cards.0.title": "message" } (first message per path). */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
}
