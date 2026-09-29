import type { NextConfig } from "next";

// Validate environment variables at startup so `next dev` / `next build` fail fast with a clear
// list of what is missing. Set SKIP_ENV_VALIDATION=1 to skip (CI).
import "./src/core/env";

const nextConfig: NextConfig = {};

export default nextConfig;
