import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../..");
const run = (...args: string[]) =>
  execFileSync("node", ["scripts/module-new.mjs", ...args], { cwd: root, encoding: "utf8" });

describe("pnpm module:new", () => {
  it("lists the files for blog with --dry-run and writes nothing", () => {
    const output = run("blog", "--dry-run");
    expect(output).toContain('Dry run for "blog". Would create:');
    for (const path of [
      "src/modules/blog/components/.gitkeep",
      "src/modules/blog/actions/.gitkeep",
      "src/modules/blog/queries/.gitkeep",
      "src/modules/blog/sections/.gitkeep",
      "src/modules/blog/admin/.gitkeep",
      "src/modules/blog/README.md",
      "docs/phases/phase-6-notes.md",
    ]) {
      // Listed as new (+) until the module's phase creates it, then as kept (=).
      expect(output).toContain(`${existsSync(join(root, path)) ? "=" : "+"} ${path}`);
    }
    expect(output).toMatch(/[+=] supabase\/migrations\/\d{14}_blog_tables\.sql/);
    expect(output).toMatch(/[+=] supabase\/tests\/database\/\d\d_blog\.test\.sql/);
    // Existing files are never overwritten.
    expect(output).toContain("= src/modules/blog/module.server.ts");
    // Nothing listed as new was written.
    for (const [, path] of output.matchAll(/^ {2}\+ (.+)$/gm)) {
      expect(existsSync(join(root, path!))).toBe(false);
    }
  });

  it("refuses a key that isn't in the registry", () => {
    expect(() => run("nope", "--dry-run")).toThrow();
  });
});
