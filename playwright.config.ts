import { execSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

/**
 * E2E tests always run against the LOCAL Supabase stack (`pnpm db:start`), never the project in
 * .env.local. These values override .env.local because Next.js never overwrites variables that
 * are already set in the environment.
 */
function localSupabaseEnv(): Record<string, string> {
  let status: Record<string, string>;
  try {
    const output = execSync("pnpm exec supabase status -o json", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    status = JSON.parse(output.slice(output.indexOf("{")));
  } catch {
    throw new Error("Local Supabase is not running. Start it with `pnpm db:start`.");
  }

  const required = ["API_URL", "PUBLISHABLE_KEY", "SECRET_KEY", "MAILPIT_URL"] as const;
  for (const key of required) {
    if (!status[key]) throw new Error(`supabase status did not report ${key}.`);
  }

  return {
    NEXT_PUBLIC_SITE_URL: baseURL,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY!,
    SUPABASE_SECRET_KEY: status.SECRET_KEY!,
    SUPER_ADMIN_EMAIL: "owner@example.test",
    MAILPIT_URL: status.MAILPIT_URL!,
  };
}

const supabaseEnv = localSupabaseEnv();
// Exposed to the tests: Mailpit, and local Supabase keys for creating test users (helpers.ts).
process.env.MAILPIT_URL = supabaseEnv.MAILPIT_URL;
process.env.E2E_SUPABASE_URL = supabaseEnv.NEXT_PUBLIC_SUPABASE_URL;
process.env.E2E_SUPABASE_PUBLISHABLE_KEY = supabaseEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
process.env.E2E_SUPABASE_SECRET_KEY = supabaseEnv.SUPABASE_SECRET_KEY;

const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: desktop, testIgnore: /branding\.spec\.ts/ },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
      testIgnore: /branding\.spec\.ts/,
    },
    // Tests that change site-wide settings run last, alone, so they never disturb other tests.
    {
      name: "branding",
      use: desktop,
      testMatch: /branding\.spec\.ts/,
      dependencies: ["desktop", "mobile"],
    },
  ],
  // A production build, so tests can run while `pnpm dev` is running (Next.js allows one dev
  // server per project) and exercise the same code paths as a deployment.
  webServer: {
    command: `pnpm build && pnpm exec next start --port ${port}`,
    url: `${baseURL}/api/health`,
    env: { ...supabaseEnv, SKIP_ENV_VALIDATION: "" },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
