import { describe, expect, it } from "vitest";
import { z } from "zod";

import { anchorIdSchema, headingTagFor } from "./common";
import {
  defaultPropsFor,
  defaultSettingsFor,
  getSectionDefinition,
  SECTION_DEFINITIONS,
} from "./registry";

const def = (key: string) => getSectionDefinition(key)!;
const withDefaults = (key: string, overrides: Record<string, unknown>) => ({
  ...defaultPropsFor(key),
  ...overrides,
});
const rejects = (key: string, overrides: Record<string, unknown>) =>
  expect(def(key).schema.safeParse(withDefaults(key, overrides)).success).toBe(false);

describe("section registry", () => {
  it("has the eleven section types with unique keys", () => {
    const keys = SECTION_DEFINITIONS.map((d) => d.key);
    expect(keys).toHaveLength(11);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(SECTION_DEFINITIONS.map((d) => [d.key, d] as const))(
    "%s accepts its defaults",
    (key, definition) => {
      const result = definition.schema.safeParse(defaultPropsFor(key));
      expect(result.error?.issues).toBeUndefined();
      expect(definition.backgrounds).toContain(defaultSettingsFor(key).background);
    },
  );

  it.each(SECTION_DEFINITIONS.map((d) => [d.key, d] as const))(
    "%s has an editor field for every top-level prop",
    (_key, definition) => {
      const shape = (definition.schema as unknown as z.ZodObject).shape ?? {};
      const fieldNames = definition.fields.map((f) => f.name).sort();
      expect(fieldNames).toEqual(Object.keys(shape).sort());
    },
  );

  it.each(SECTION_DEFINITIONS.map((d) => [d.key, d] as const))(
    "%s rejects non-object props",
    (_key, definition) => {
      expect(definition.schema.safeParse("hello").success).toBe(false);
      expect(definition.schema.safeParse(null).success).toBe(false);
    },
  );

  it("rejects bad input for specific fields", () => {
    rejects("hero", { headline: "x".repeat(500) });
    rejects("hero", { image: { mediaId: "not-a-uuid" } });
    rejects("hero", {
      primary: { label: "Go", link: { kind: "url", href: "javascript:alert(1)" } },
    });
    rejects("value_strip", { items: [] });
    rejects("stats", { stats: Array.from({ length: 5 }, () => ({ value: "1", label: "x" })) });
    rejects("card_grid", { columns: "5" });
    rejects("module_feed", { count: "4" });
    rejects("rich_text", { width: "huge" });
    rejects("image_with_text", { imagePosition: "top" });
  });
});

describe("headingTagFor", () => {
  it("makes the first section the h1 and every other section an h2", () => {
    expect(headingTagFor(0)).toBe("h1");
    expect(headingTagFor(1)).toBe("h2");
    expect(headingTagFor(8)).toBe("h2");
  });
});

describe("anchorIdSchema", () => {
  it("accepts slugs and empty, rejects anything else", () => {
    expect(anchorIdSchema.parse(" Growth-Strategy ")).toBe("growth-strategy");
    expect(anchorIdSchema.safeParse("").success).toBe(true);
    expect(anchorIdSchema.safeParse("two words").success).toBe(false);
    expect(anchorIdSchema.safeParse("-leading").success).toBe(false);
  });
});
