import { describe, expect, it } from "vitest";

import { richTextFromParagraphs } from "./rich-text";
import { renderRichText, sanitizeRichTextHtml } from "./render-rich-text";

describe("rich text rendering", () => {
  it("renders paragraphs, bold, italic, links, and lists", () => {
    const html = renderRichText({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
            { type: "text", text: " and a ", marks: [] },
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }],
            },
          ],
        },
      ],
    });
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>',
    );
    expect(html).toContain("<ul><li><p>One</p></li></ul>");
  });

  it("renders plain paragraphs", () => {
    expect(renderRichText(richTextFromParagraphs("Hello", "World"))).toBe(
      "<p>Hello</p><p>World</p>",
    );
  });

  it("drops node types outside the allowed set instead of rendering them", () => {
    const html = renderRichText({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Big" }] },
        { type: "paragraph", content: [{ type: "text", text: "Ok" }] },
      ],
    });
    expect(html).not.toContain("<h1");
  });

  it("strips disallowed HTML", () => {
    const html = sanitizeRichTextHtml(
      '<p onclick="x()">Hi<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><h2>no</h2><iframe></iframe></p>',
    );
    for (const forbidden of [
      "script",
      "onclick",
      "onerror",
      "<img",
      "javascript:",
      "<h2",
      "<iframe",
    ]) {
      expect(html).not.toContain(forbidden);
    }
    expect(html).toContain("Hi");
    expect(html).toContain("no");
  });

  it("keeps relative, mailto, and tel links without a new tab", () => {
    expect(sanitizeRichTextHtml('<p><a href="/about">a</a><a href="mailto:x@y.z">b</a></p>')).toBe(
      '<p><a href="/about">a</a><a href="mailto:x@y.z">b</a></p>',
    );
  });

  it("returns an empty string for empty or invalid documents", () => {
    expect(renderRichText(null)).toBe("");
    expect(renderRichText({ type: "doc" })).toBe("");
  });
});
