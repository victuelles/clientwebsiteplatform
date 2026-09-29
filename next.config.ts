import type { NextConfig } from "next";

// Validate environment variables at startup so `next dev` / `next build` fail fast with a clear
// list of what is missing. Set SKIP_ENV_VALIDATION=1 to skip (CI).
import { env } from "./src/core/env";

// next/image may optimize files from this deployment's Supabase Storage (the media bucket).
function supabaseStorage(): { pattern: URL | null; local: boolean } {
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return { pattern: new URL("/storage/v1/object/public/**", url), local };
  } catch {
    return { pattern: null, local: false }; // SKIP_ENV_VALIDATION builds
  }
}

const storage = supabaseStorage();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storage.pattern ? [storage.pattern] : [],
    // Local Supabase runs on 127.0.0.1, which Next.js blocks by default. Never true in production.
    dangerouslyAllowLocalIP: storage.local,
  },
};

export default nextConfig;
