import { describe, expect, it } from "vitest";

import { countSectionChanges, draftSnapshot } from "./draft-diff";

const s = (id: string, props: object = {}, extra: object = {}) => ({
  id,
  type: "hero",
  props,
  background: "white",
  padding: "normal",
  anchor_id: null,
  ...extra,
});

describe("draft diff", () => {
  it("ignores hidden sections, like publish_page", () => {
    expect(draftSnapshot([s("a"), s("b", {}, { is_hidden: true })]).map((x) => x.id)).toEqual([
      "a",
    ]);
  });

  it("counts added, removed, edited, and moved sections", () => {
    const published = [s("a", { t: 1 }), s("b"), s("c")];
    expect(countSectionChanges(published, published)).toBe(0);
    expect(countSectionChanges([s("a", { t: 2 }), s("b"), s("c")], published)).toBe(1);
    expect(countSectionChanges([s("a", { t: 1 }), s("b"), s("c"), s("d")], published)).toBe(1);
    expect(countSectionChanges([s("a", { t: 1 }), s("b")], published)).toBe(1);
    expect(countSectionChanges([s("b"), s("a", { t: 1 }), s("c")], published)).toBe(2);
  });

  it("does not care about key order in props", () => {
    expect(countSectionChanges([s("a", { x: 1, y: 2 })], [s("a", { y: 2, x: 1 })])).toBe(0);
  });
});
