/**
 * The single source of environment variables for the whole app.
 *
 * Rules:
 * - Never read `process.env` anywhere else; import `env` from here.
 * - Server-only variables are only available on the server. Reading one in the browser throws.
 * - Set SKIP_ENV_VALIDATION=1 to skip validation (CI lint/build without real secrets).
 */
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const requiredString = () => z.preprocess(emptyToUndefined, z.string().trim().min(1));
const optionalString = () => z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const requiredUrl = () => z.preprocess(emptyToUndefined, z.url());
const optionalPrefixed = (...prefixes: string[]) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine((value) => prefixes.some((prefix) => value.startsWith(prefix)), {
        message: `must start with ${prefixes.join(" or ")}`,
      })
      .optional(),
  );

/** Variables that are safe to expose to the browser. Must be prefixed with NEXT_PUBLIC_. */
export const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: requiredUrl(),
  NEXT_PUBLIC_SUPABASE_URL: requiredUrl(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredString(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalPrefixed("pk_"),
});

/** Variables that must never reach the browser. */
export const serverSchema = z.object({
  SUPABASE_SECRET_KEY: requiredString(),
  // The account that becomes the super admin on first confirmed sign-in (Phase 1 bootstrap).
  SUPER_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email()),
  STRIPE_SECRET_KEY: optionalPrefixed("sk_", "rk_"),
  STRIPE_WEBHOOK_SECRET: optionalPrefixed("whsec_"),
  RESEND_API_KEY: optionalString(),
  // Either "hello@example.com" or "Example <hello@example.com>".
  RESEND_FROM_EMAIL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^(?:[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/, {
        message: 'must be an email or "Name <email>"',
      })
      .optional(),
  ),
  MUX_TOKEN_ID: optionalString(),
  MUX_TOKEN_SECRET: optionalString(),
  MUX_WEBHOOK_SECRET: optionalString(),
  // Set automatically by Vercel.
  VERCEL_GIT_COMMIT_SHA: optionalString(),
});

const fullSchema = clientSchema.extend(serverSchema.shape);

export type ClientEnv = z.infer<typeof clientSchema>;
export type Env = z.infer<typeof fullSchema>;

type RawEnv = Record<string, string | undefined>;

export class EnvValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      [
        "Invalid environment variables:",
        ...problems.map((problem) => `  - ${problem}`),
        "",
        "Set them in .env.local (see .env.example) or in your hosting provider's settings.",
      ].join("\n"),
    );
    this.name = "EnvValidationError";
  }
}

function validate<S extends z.ZodObject>(schema: S, raw: RawEnv): z.infer<S> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "(unknown)");
    const value = raw[key];
    const missing = value === undefined || value.trim() === "";
    return missing ? `${key}: missing` : `${key}: ${issue.message}`;
  });
  throw new EnvValidationError(problems);
}

/** Validates a full (server) environment. Exported for tests. */
export function parseEnv(raw: RawEnv): Env {
  return validate(fullSchema, raw);
}

/** Validates only the browser-safe part of the environment. Exported for tests. */
export function parseClientEnv(raw: RawEnv): ClientEnv {
  return validate(clientSchema, raw);
}

// NEXT_PUBLIC_ variables must be referenced literally so Next.js can inline them into the
// browser bundle. Server variables are read from process.env and are undefined in the browser.
const runtimeEnv: RawEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
  MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET,
  MUX_WEBHOOK_SECRET: process.env.MUX_WEBHOOK_SECRET,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
};

const isServer = typeof window === "undefined";
const skipValidation = ["1", "true"].includes(process.env.SKIP_ENV_VALIDATION ?? "");

function load(): Env {
  if (skipValidation) {
    // Unvalidated: only for CI lint/build. Empty strings still become undefined.
    return Object.fromEntries(
      Object.entries(runtimeEnv).map(([key, value]) => [key, emptyToUndefined(value)]),
    ) as Env;
  }
  // In the browser only the NEXT_PUBLIC_ part exists, so only that part is validated.
  return (isServer ? parseEnv(runtimeEnv) : parseClientEnv(runtimeEnv)) as Env;
}

const loaded = load();

/** Validated environment. Server-only keys throw if read in the browser. */
export const env: Readonly<Env> = new Proxy(loaded, {
  get(target, prop, receiver) {
    if (!isServer && typeof prop === "string" && prop in serverSchema.shape) {
      throw new Error(`Server-only environment variable ${prop} was read in the browser.`);
    }
    return Reflect.get(target, prop, receiver);
  },
});

export type IntegrationStatus = {
  stripe: boolean;
  resend: boolean;
  mux: boolean;
};

/** Returns which integrations have all of their keys configured. Server only. */
export function getIntegrationStatus(source: Partial<Env> = env): IntegrationStatus {
  const all = (...values: unknown[]) => values.every((value) => Boolean(value));
  return {
    stripe: all(
      source.STRIPE_SECRET_KEY,
      source.STRIPE_WEBHOOK_SECRET,
      source.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ),
    resend: all(source.RESEND_API_KEY, source.RESEND_FROM_EMAIL),
    mux: all(source.MUX_TOKEN_ID, source.MUX_TOKEN_SECRET, source.MUX_WEBHOOK_SECRET),
  };
}
