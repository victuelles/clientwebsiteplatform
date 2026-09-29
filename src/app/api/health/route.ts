import { env } from "@/core/env";

export const dynamic = "force-dynamic";

export type HealthResponse = {
  status: "ok" | "degraded";
  commit: string | null;
  supabase: { reachable: boolean; latencyMs: number | null };
  timestamp: string;
};

/**
 * Liveness plus a Supabase reachability probe. Always 200 while the app itself is up; a Supabase
 * outage shows as `status: "degraded"`. Never include secrets in this response.
 */
export async function GET() {
  const supabase = await checkSupabase();

  const body: HealthResponse = {
    status: supabase.reachable ? "ok" : "degraded",
    commit: env.VERCEL_GIT_COMMIT_SHA ?? null,
    supabase,
    timestamp: new Date().toISOString(),
  };

  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

async function checkSupabase(): Promise<HealthResponse["supabase"]> {
  const started = performance.now();
  try {
    const response = await fetch(new URL("/auth/v1/health", env.NEXT_PUBLIC_SUPABASE_URL), {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return {
      reachable: response.ok,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch {
    return { reachable: false, latencyMs: null };
  }
}
