import type { AccessDecision } from "./decide";

/** Safe, user-facing messages for denied decisions (used by actions and routes). */
export const DENIED_MESSAGES: Record<Exclude<AccessDecision, "allowed">, string> = {
  unauthenticated: "Your session has expired. Please sign in again.",
  inactive: "Your account has been disabled.",
  forbidden: "You don't have permission to do that.",
  module_disabled: "This module is turned off.",
};

export const GENERIC_ERROR = "Something went wrong. Please try again.";
export const VALIDATION_ERROR = "Please fix the highlighted fields.";
