import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// The pgTAP test for the module table policy template embeds the template's POLICIES block (the
// test container can't read supabase/templates). This keeps the two identical.

const root = join(__dirname, "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function policies(sql: string): string {
  const match = /-- BEGIN POLICIES\n([\s\S]*?)-- END POLICIES/.exec(sql);
  if (!match) throw new Error("POLICIES block not found.");
  return match[1]!.replace(/\s+/g, " ").trim();
}

describe("module table policy template", () => {
  it("matches the block tested in 08_module_policy_template.test.sql", () => {
    const template = policies(read("supabase/templates/module-table.sql"))
      .replaceAll("__module__", "blog")
      .replaceAll("__table__", "tmpl_items");
    const tested = policies(read("supabase/tests/database/08_module_policy_template.test.sql"));
    expect(tested).toBe(template);
  });
});
