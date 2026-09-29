import { describe, expect, it } from "vitest";

import { parseSocialLinks, socialLinksSchema } from "./social";

describe("social links schema", () => {
  it("accepts web links and normalises email and phone", () => {
    expect(
      socialLinksSchema.parse([
        { platform: "linkedin", url: "https://www.linkedin.com/company/north-co" },
        { platform: "email", url: "hello@example.com" },
        { platform: "phone", url: "+1 (650) 410-7800" },
      ]),
    ).toEqual([
      { platform: "linkedin", url: "https://www.linkedin.com/company/north-co" },
      { platform: "email", url: "mailto:hello@example.com" },
      { platform: "phone", url: "tel:+16504107800" },
    ]);
  });

  it.each([
    [{ platform: "instagram", url: "http://instagram.com/x" }],
    [{ platform: "x", url: "javascript:alert(1)" }],
    [{ platform: "email", url: "not-an-email" }],
    [{ platform: "phone", url: "call me" }],
    [{ platform: "myspace", url: "https://myspace.com/x" }],
  ])("rejects %j", (link) => {
    expect(socialLinksSchema.safeParse([link]).success).toBe(false);
  });

  it("drops invalid stored links instead of failing", () => {
    expect(
      parseSocialLinks([
        { platform: "x", url: "https://x.com/north" },
        { platform: "x", url: "nope" },
        5,
      ]),
    ).toEqual([{ platform: "x", url: "https://x.com/north" }]);
    expect(parseSocialLinks(null)).toEqual([]);
  });
});
