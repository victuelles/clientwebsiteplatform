import { describe, expect, it } from "vitest";

import { isSectionAvailable, sectionUnavailableReason } from "./availability";
import { getSectionDefinition } from "./registry";

describe("section availability", () => {
  it("core sections are always available", () => {
    expect(isSectionAvailable(getSectionDefinition("hero")!, {})).toBe(true);
  });

  it("the module feed needs a module that provides a feed", () => {
    const feed = getSectionDefinition("module_feed")!;
    expect(isSectionAvailable(feed, {})).toBe(false);
    expect(isSectionAvailable(feed, { crm: true })).toBe(false);
    expect(isSectionAvailable(feed, { blog: true })).toBe(true);
  });

  it("a module's section needs that module", () => {
    const definition = { requiresModule: "shop" };
    expect(sectionUnavailableReason(definition, { shop: false })).toBe(
      "The Shop module is turned off, so visitors don't see this section.",
    );
    expect(sectionUnavailableReason(definition, { shop: true })).toBeNull();
  });
});
