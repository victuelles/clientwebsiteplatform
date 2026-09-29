import { describe, expect, it } from "vitest";

import type { IntegrationDetails } from "@/core/env";

import { getModule, listModules } from "./registry";
import {
  disableBlockedMessage,
  disableBlockers,
  enableBlockedMessage,
  enableBlockers,
  listLabels,
  moduleHealth,
} from "./rules";

const none: IntegrationDetails = {
  stripe: { configured: false, missing: ["STRIPE_SECRET_KEY"] },
  resend: { configured: false, missing: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] },
  mux: { configured: false, missing: ["MUX_TOKEN_ID"] },
};
const all: IntegrationDetails = {
  stripe: { configured: true, missing: [] },
  resend: { configured: true, missing: [] },
  mux: { configured: true, missing: [] },
};
const label = (key: string) => getModule(key)?.label ?? key;
const off = {};

describe("enableBlockers", () => {
  it("allows a module with no requirements", () => {
    expect(enableBlockers(getModule("blog")!, off, none)).toEqual([]);
  });

  it("requires the modules it depends on", () => {
    const blockers = enableBlockers(getModule("email_marketing")!, off, all, label);
    expect(blockers).toEqual([{ kind: "module", key: "crm", label: "CRM" }]);
    expect(enableBlockers(getModule("email_marketing")!, { crm: true }, all)).toEqual([]);
  });

  it("requires its integrations, naming the missing variables", () => {
    expect(enableBlockers(getModule("shop")!, off, none)).toEqual([
      { kind: "integration", key: "stripe", label: "Stripe", missing: ["STRIPE_SECRET_KEY"] },
    ]);
    expect(enableBlockers(getModule("shop")!, off, all)).toEqual([]);
  });

  it("ignores optional integrations", () => {
    expect(enableBlockers(getModule("booking")!, off, none)).toEqual([]);
  });

  it("explains every blocker in one sentence", () => {
    const blockers = enableBlockers(getModule("email_marketing")!, off, none, label);
    expect(enableBlockedMessage("Email marketing", blockers)).toBe(
      "To turn on Email marketing, turn on CRM first and configure Resend.",
    );
  });
});

describe("disableBlockers", () => {
  it("blocks turning off a module an enabled module requires", () => {
    const dependents = disableBlockers("crm", listModules(), { crm: true, email_marketing: true });
    expect(dependents.map((m) => m.key)).toEqual(["email_marketing"]);
    expect(disableBlockedMessage("CRM", dependents)).toBe(
      "CRM can't be turned off while Email marketing is on. Turn it off first.",
    );
  });

  it("allows it once the dependent is off", () => {
    expect(disableBlockers("crm", listModules(), { crm: true })).toEqual([]);
  });

  it("ignores soft relationships", () => {
    expect(disableBlockers("inventory", listModules(), { inventory: true, shop: true })).toEqual(
      [],
    );
  });
});

describe("moduleHealth", () => {
  it("warns when a required integration is missing", () => {
    expect(moduleHealth(getModule("video_gallery")!, none)).toEqual([
      {
        message: "Mux is not configured (missing MUX_TOKEN_ID). Video gallery needs it to work.",
        href: "/admin/settings?tab=integrations",
      },
    ]);
  });

  it("is healthy when requirements are met, and adds the module's own warnings", () => {
    expect(moduleHealth(getModule("video_gallery")!, all)).toEqual([]);
    expect(moduleHealth(getModule("blog")!, none, [{ message: "No posts yet." }])).toEqual([
      { message: "No posts yet." },
    ]);
  });
});

describe("listLabels", () => {
  it.each([
    [["A"], "A"],
    [["A", "B"], "A and B"],
    [["A", "B", "C"], "A, B, and C"],
  ])("%j", (labels, text) => {
    expect(listLabels(labels)).toBe(text);
  });
});
