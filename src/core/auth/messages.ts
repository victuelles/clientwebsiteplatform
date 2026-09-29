// User-facing auth messages. None of them reveal whether an email address is registered.

export const AUTH_MESSAGES = {
  invalidCredentials:
    "We couldn't sign you in. Check your email and password, and make sure you have confirmed your email address.",
  rateLimited: "Too many attempts. Please wait a minute and try again.",
  unexpected: "Something went wrong. Please try again.",
  magicLinkSent:
    "If an account exists for that email, we've sent a sign-in link. Check your inbox.",
  signUpSent: "Check your email to confirm your account. The link expires in one hour.",
  resetSent: "If an account exists for that email, we've sent a password reset link.",
} as const;

export const SIGN_IN_ERRORS: Record<string, string> = {
  account_disabled:
    "This account has been disabled. Contact the site owner if you think this is a mistake.",
  link_invalid: "That link is invalid or has expired. Please request a new one.",
};
