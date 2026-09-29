import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Integration tests against local Supabase (`pnpm db:start`). Run with `pnpm test:int`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    testTimeout: 30_000,
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
