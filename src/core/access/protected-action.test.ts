import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { fakeContext } from "./test-helpers";

const mocks = vi.hoisted(() => ({
  getAccessContext: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("./context", () => ({ getAccessContext: mocks.getAccessContext }));
vi.mock("@/core/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));

const { ActionError, protectedAction } = await import("./protected-action");

const schema = z.object({ title: z.string().min(3, "Too short.") });

function makeAction(
  handler = vi.fn(async ({ input }: { input: { title: string } }) => ({ saved: input.title })),
) {
  return {
    handler,
    action: protectedAction({
      scope: "content",
      action: "edit",
      schema,
      audit: {
        action: "content.saved",
        target: (_input, data) => ({ table: "pages", id: data.saved }),
        metadata: (input) => ({ title: input.title }),
      },
      handler,
    }),
  };
}

const staffWithEdit = () =>
  fakeContext({ role: "staff", permissions: [{ scope: "content", action: "edit" }] });

beforeEach(() => {
  mocks.getAccessContext.mockReset();
  mocks.rpc.mockReset().mockResolvedValue({ error: null });
});

describe("protectedAction", () => {
  it("returns fieldErrors for invalid input and does not run the handler", async () => {
    mocks.getAccessContext.mockResolvedValue(staffWithEdit());
    const { action, handler } = makeAction();

    const result = await action({ title: "x" });

    expect(result).toEqual({
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { title: ["Too short."] },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns a generic error for forbidden calls, before validating input", async () => {
    mocks.getAccessContext.mockResolvedValue(fakeContext({ role: "staff", permissions: [] }));
    const { action, handler } = makeAction();

    const result = await action({ title: "x" });

    expect(result).toEqual({ ok: false, error: "You don't have permission to do that." });
    expect(handler).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    [fakeContext({ role: null }), "Your session has expired. Please sign in again."],
    [fakeContext({ role: "staff", active: false }), "Your account has been disabled."],
    [fakeContext({ role: "user" }), "You don't have permission to do that."],
  ])("rejects denied callers with a safe message (%#)", async (context, message) => {
    mocks.getAccessContext.mockResolvedValue(context);
    const { action } = makeAction();
    expect(await action({ title: "Valid" })).toEqual({ ok: false, error: message });
  });

  it("runs the handler, writes the audit entry, and returns data", async () => {
    mocks.getAccessContext.mockResolvedValue(staffWithEdit());
    const { action } = makeAction();

    const result = await action({ title: "Hello" });

    expect(result).toEqual({ ok: true, data: { saved: "Hello" } });
    expect(mocks.rpc).toHaveBeenCalledWith("log_audit", {
      action: "content.saved",
      scope: "content",
      target_table: "pages",
      target_id: "Hello",
      metadata: { title: "Hello" },
    });
  });

  it("never leaks internal error messages", async () => {
    mocks.getAccessContext.mockResolvedValue(staffWithEdit());
    const { action } = makeAction(
      vi.fn(async () => {
        throw new Error('duplicate key value violates unique constraint "secret_table_pkey"');
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await action({ title: "Hello" })).toEqual({
      ok: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("returns the message of an ActionError", async () => {
    mocks.getAccessContext.mockResolvedValue(staffWithEdit());
    const { action } = makeAction(
      vi.fn(async () => {
        throw new ActionError("That page is locked.");
      }),
    );
    expect(await action({ title: "Hello" })).toEqual({ ok: false, error: "That page is locked." });
  });

  it("supports role requirements", async () => {
    const action = protectedAction({
      role: "super_admin",
      schema: z.object({}),
      handler: async () => "done",
    });
    mocks.getAccessContext.mockResolvedValue(fakeContext({ role: "staff" }));
    expect(await action({})).toEqual({ ok: false, error: "You don't have permission to do that." });
    mocks.getAccessContext.mockResolvedValue(fakeContext({ role: "super_admin" }));
    expect(await action({})).toEqual({ ok: true, data: "done" });
  });

  it("skips the audit entry when `when` returns false", async () => {
    mocks.getAccessContext.mockResolvedValue(fakeContext({ role: "super_admin" }));
    const action = protectedAction({
      role: "super_admin",
      schema: z.object({}),
      audit: { action: "noop", when: () => false },
      handler: async () => "done",
    });
    await action({});
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
