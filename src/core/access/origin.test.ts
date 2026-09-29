import { describe, expect, it } from "vitest";

import { isAllowedOrigin, isMutatingMethod } from "./origin";

describe("origin checks", () => {
  it("allows only the exact site origin", () => {
    expect(isAllowedOrigin("https://client.example", "https://client.example")).toBe(true);
    expect(isAllowedOrigin("https://client.example", "https://client.example/some/path")).toBe(
      true,
    );
    expect(isAllowedOrigin("https://client.example.evil.com", "https://client.example")).toBe(
      false,
    );
    expect(isAllowedOrigin("http://client.example", "https://client.example")).toBe(false);
    expect(isAllowedOrigin(null, "https://client.example")).toBe(false);
    expect(isAllowedOrigin("null", "https://client.example")).toBe(false);
  });

  it("treats everything but GET/HEAD/OPTIONS as mutating", () => {
    expect(isMutatingMethod("GET")).toBe(false);
    expect(isMutatingMethod("head")).toBe(false);
    expect(["POST", "PUT", "PATCH", "DELETE"].every(isMutatingMethod)).toBe(true);
  });
});
