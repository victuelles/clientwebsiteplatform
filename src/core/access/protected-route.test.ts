import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeContext } from "./test-helpers";

const mocks = vi.hoisted(() => ({ getAccessContext: vi.fn() }));
vi.mock("./context", () => ({ getAccessContext: mocks.getAccessContext }));
vi.mock("@/core/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://client.example" } }));

const { protectedRoute } = await import("./protected-route");

const handler = vi.fn(async () => Response.json({ ok: true }));
const route = protectedRoute({ scope: "blog", action: "edit" }, handler);

function request(method: string, origin?: string) {
  return new NextRequest("https://client.example/api/thing", {
    method,
    headers: origin ? { origin } : {},
  });
}

beforeEach(() => {
  handler.mockClear();
  mocks.getAccessContext.mockReset();
});

describe("protectedRoute", () => {
  it("rejects mutating requests from another origin before checking access", async () => {
    const response = await route(request("POST", "https://evil.example"), {});
    expect(response.status).toBe(403);
    expect(mocks.getAccessContext).not.toHaveBeenCalled();
  });

  it("rejects mutating requests with no Origin header", async () => {
    expect((await route(request("DELETE"), {})).status).toBe(403);
  });

  it.each([
    ["signed out", fakeContext({ role: null }), 401],
    ["inactive", fakeContext({ role: "staff", active: false }), 401],
    ["no permission", fakeContext({ role: "staff", modules: { blog: true } }), 403],
    ["module disabled", fakeContext({ role: "super_admin", modules: { blog: false } }), 404],
  ])("answers %s with %i", async (_name, context, status) => {
    mocks.getAccessContext.mockResolvedValue(context);
    const response = await route(request("POST", "https://client.example"), {});
    expect(response.status).toBe(status);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler when allowed (GET needs no Origin)", async () => {
    mocks.getAccessContext.mockResolvedValue(
      fakeContext({
        role: "staff",
        permissions: [{ scope: "blog", action: "edit" }],
        modules: { blog: true },
      }),
    );
    const response = await route(request("GET"), {});
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("hides handler errors behind a generic 500", async () => {
    mocks.getAccessContext.mockResolvedValue(
      fakeContext({ role: "super_admin", modules: { blog: true } }),
    );
    handler.mockRejectedValueOnce(new Error("internal detail"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await route(request("GET"), {});
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Something went wrong. Please try again." });
  });
});
