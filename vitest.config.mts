import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Importing env.ts validates process.env at load time; tests call parseEnv() directly instead.
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
