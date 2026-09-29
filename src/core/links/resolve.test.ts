import { describe, expect, it } from "vitest";

import { linkAttributes, resolveLink, type LinkContext } from "./resolve";
import { linkSchema } from "./types";

const HOME = "00000000-0000-4000-8000-00000000000a";
const ABOUT = "00000000-0000-4000-8000-00000000000b";
const DRAFT = "00000000-0000-4000-8000-00000000000c";

const context: LinkContext = {
  pages: {
    [HOME]: { slug: "home", isHome: true, published: true },
    [ABOUT]: { slug: "about-us", isHome: false, published: true },
    [DRAFT]: { slug: "secret", isHome: false, published: false },
  },
  modules: { blog: true, shop: false },
};

describe("resolveLink", () => {
  it("resolves page links by id (renaming a slug never breaks them)", () => {
    expect(resolveLink({ kind: "page", pageId: ABOUT }, context)).toEqual({
      href: "/about-us",
      external: false,
    });
    const renamed = {
      ...context,
      pages: { ...context.pages, [ABOUT]: { slug: "who-we-are", isHome: false, published: true } },
    };
    expect(resolveLink({ kind: "page", pageId: ABOUT }, renamed)?.href).toBe("/who-we-are");
  });

  it("links the homepage to /", () => {
    expect(resolveLink({ kind: "page", pageId: HOME }, context)?.href).toBe("/");
  });

  it("hides links to unpublished or missing pages", () => {
    expect(resolveLink({ kind: "page", pageId: DRAFT }, context)).toBeNull();
    expect(
      resolveLink({ kind: "page", pageId: "00000000-0000-4000-8000-0000000000ff" }, context),
    ).toBeNull();
  });

  it("marks absolute URLs as external and keeps paths internal", () => {
    expect(resolveLink({ kind: "url", href: "https://example.com/x" }, context)).toEqual({
      href: "https://example.com/x",
      external: true,
    });
    expect(resolveLink({ kind: "url", href: "/pricing" }, context)).toEqual({
      href: "/pricing",
      external: false,
    });
  });

  it("resolves anchors on this page or another page", () => {
    expect(resolveLink({ kind: "anchor", anchorId: "contact" }, context)?.href).toBe("#contact");
    expect(
      resolveLink({ kind: "anchor", anchorId: "growth-strategy", pageId: ABOUT }, context)?.href,
    ).toBe("/about-us#growth-strategy");
    expect(resolveLink({ kind: "anchor", anchorId: "top", pageId: HOME }, context)?.href).toBe(
      "/#top",
    );
    expect(resolveLink({ kind: "anchor", anchorId: "x", pageId: DRAFT }, context)).toBeNull();
  });

  it("builds mailto and tel links", () => {
    expect(resolveLink({ kind: "email", address: "hello@example.com" }, context)?.href).toBe(
      "mailto:hello@example.com",
    );
    expect(resolveLink({ kind: "phone", number: "+1 (650) 410-7800" }, context)?.href).toBe(
      "tel:+16504107800",
    );
  });

  it("hides module links when the module is turned off", () => {
    expect(resolveLink({ kind: "module", moduleKey: "blog", path: "/blog" }, context)?.href).toBe(
      "/blog",
    );
    expect(resolveLink({ kind: "module", moduleKey: "shop", path: "/shop" }, context)).toBeNull();
    expect(resolveLink({ kind: "module", moduleKey: "unknown", path: "/x" }, context)).toBeNull();
  });

  it("returns null for no link", () => {
    expect(resolveLink(null, context)).toBeNull();
    expect(resolveLink(undefined, context)).toBeNull();
  });
});

describe("linkAttributes", () => {
  it("opens external links in a new tab with rel=noopener noreferrer", () => {
    expect(linkAttributes({ href: "https://x.com", external: true })).toEqual({
      href: "https://x.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(linkAttributes({ href: "/about", external: false })).toEqual({ href: "/about" });
    expect(linkAttributes({ href: "/about", external: false }, true)).toMatchObject({
      target: "_blank",
    });
  });
});

describe("linkSchema", () => {
  it.each([
    { kind: "url", href: "javascript:alert(1)" },
    { kind: "url", href: "//evil.com" },
    { kind: "page", pageId: "not-a-uuid" },
    { kind: "anchor", anchorId: "Has Spaces" },
    { kind: "email", address: "nope" },
    { kind: "phone", number: "call me" },
    { kind: "module", moduleKey: "blog", path: "blog" },
    { kind: "carrier-pigeon" },
  ])("rejects %j", (link) => {
    expect(linkSchema.safeParse(link).success).toBe(false);
  });
});
