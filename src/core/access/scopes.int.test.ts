import { execSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/core/supabase/database.types";

import { listModules } from "@/core/modules/registry";

import { SCOPES } from "./scopes";

// Integration test: needs local Supabase (`pnpm db:start`). Run with `pnpm test:int`.
function localClient() {
  const output = execSync("pnpm exec supabase status -o json", {
    stdio: ["ignore", "pipe", "ignore"],
  }).toString();
  const status = JSON.parse(output.slice(output.indexOf("{"))) as Record<string, string>;
  return createClient<Database>(status.API_URL!, status.SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("scope registry", () => {
  it("matches public.permission_scopes exactly", async () => {
    const { data, error } = await localClient()
      .from("permission_scopes")
      .select("key, label, kind, sort_order")
      .order("sort_order");
    expect(error).toBeNull();

    const fromDatabase = (data ?? []).map((row) => ({
      key: row.key,
      label: row.label,
      kind: row.kind,
      sortOrder: row.sort_order,
    }));
    const fromCode = [...SCOPES].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(fromCode).toEqual(fromDatabase);
  });

  it("has a modules row for every module scope and none for core scopes", async () => {
    const { data, error } = await localClient().from("modules").select("key").order("key");
    expect(error).toBeNull();
    const moduleKeys = SCOPES.filter((scope) => scope.kind === "module")
      .map((scope) => scope.key)
      .sort();
    expect((data ?? []).map((row) => row.key)).toEqual(moduleKeys);
  });

  it("has a module manifest for every modules row", async () => {
    const { data, error } = await localClient().from("modules").select("key").order("key");
    expect(error).toBeNull();
    expect(
      listModules()
        .map((m) => m.key)
        .sort(),
    ).toEqual((data ?? []).map((row) => row.key));
  });

  it("mirrors every manifest's requiresModules in public.module_dependencies", async () => {
    const { data, error } = await localClient()
      .from("module_dependencies")
      .select("module_key, requires_key");
    expect(error).toBeNull();
    const fromDatabase = (data ?? []).map((row) => `${row.module_key} -> ${row.requires_key}`);
    const fromCode = listModules().flatMap((m) =>
      m.requiresModules.map((required) => `${m.key} -> ${required}`),
    );
    expect(fromCode.sort()).toEqual(fromDatabase.sort());
  });
});
