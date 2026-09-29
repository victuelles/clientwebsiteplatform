"use client";

import { useEffect, useState } from "react";

import type { HealthResponse } from "@/app/api/health/route";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; health: HealthResponse };

export function HealthStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<HealthResponse>)
      .then((health) => setState({ kind: "ready", health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "error" });
      });
    return () => controller.abort();
  }, []);

  if (state.kind === "loading") return <Skeleton className="h-5 w-72" />;

  const ok = state.kind === "ready" && state.health.status === "ok";
  const text =
    state.kind === "error"
      ? "App health check failed"
      : `App ok · Supabase ${state.health.supabase.reachable ? "reachable" : "unreachable"}` +
        (state.health.supabase.latencyMs !== null
          ? ` (${state.health.supabase.latencyMs} ms)`
          : "") +
        (state.health.commit ? ` · ${state.health.commit.slice(0, 7)}` : "");

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-destructive")}
      />
      {text}
    </p>
  );
}
