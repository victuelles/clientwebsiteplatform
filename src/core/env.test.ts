import { describe, expect, it } from "vitest";

import { EnvValidationError, getIntegrationStatus, parseEnv } from "./env";

const validEnv = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    const env = parseEnv(validEnv);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it("fails with a readable message listing every missing required variable", () => {
    const { SUPABASE_SECRET_KEY: _omitted, ...rest } = validEnv;

    let error: unknown;
    try {
      parseEnv({ ...rest, NEXT_PUBLIC_SITE_URL: "" });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(EnvValidationError);
    const message = (error as EnvValidationError).message;
    expect(message).toContain("Invalid environment variables:");
    expect(message).toContain("  - SUPABASE_SECRET_KEY: missing");
    expect(message).toContain("  - NEXT_PUBLIC_SITE_URL: missing");
  });

  it("reports invalid values, not just missing ones", () => {
    expect(() => parseEnv({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL: /,
    );
  });
});

describe("getIntegrationStatus", () => {
  it("marks an integration configured only when all of its keys are present", () => {
    const status = getIntegrationStatus({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "Site <hello@example.com>",
      MUX_TOKEN_ID: "id",
    });
    expect(status).toEqual({ stripe: false, resend: true, mux: false });
  });
});
