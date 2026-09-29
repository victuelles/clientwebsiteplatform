import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { imageDimensions } from "./dimensions";
import {
  isLibraryStoragePath,
  MAX_UPLOAD_BYTES,
  sniffMimeType,
  storagePathFor,
  validateUpload,
} from "./upload-rules";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name)));
const svg = (markup: string) => new TextEncoder().encode(markup);

describe("validateUpload", () => {
  const file = (mimeType: string, size = 1000, filename = "photo") => ({
    mimeType,
    size,
    filename,
  });

  it.each(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "application/pdf"])(
    "allows %s for everyone with media access",
    (type) => {
      expect(validateUpload(file(type), { allowSvg: false })).toEqual({ ok: true, mimeType: type });
    },
  );

  it("allows SVG only for the super admin", () => {
    expect(validateUpload(file("image/svg+xml"), { allowSvg: true }).ok).toBe(true);
    const staff = validateUpload(file("image/svg+xml", 1000, "logo.svg"), { allowSvg: false });
    expect(staff).toEqual({
      ok: false,
      error: "logo.svg: only the site owner can upload SVG files.",
    });
  });

  it.each(["text/html", "application/zip", "video/mp4", "image/tiff", ""])("rejects %j", (type) => {
    expect(validateUpload(file(type), { allowSvg: true }).ok).toBe(false);
  });

  it("enforces the 10 MB limit and rejects empty files", () => {
    expect(validateUpload(file("image/png", MAX_UPLOAD_BYTES), { allowSvg: false }).ok).toBe(true);
    expect(
      validateUpload(file("image/png", MAX_UPLOAD_BYTES + 1), { allowSvg: false }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("larger than 10 MB"),
    });
    expect(validateUpload(file("image/png", 0), { allowSvg: false }).ok).toBe(false);
  });

  it("accepts upper-case MIME types from browsers", () => {
    expect(validateUpload(file("IMAGE/PNG"), { allowSvg: false })).toEqual({
      ok: true,
      mimeType: "image/png",
    });
  });
});

describe("storage paths", () => {
  it("builds random, dated paths inside library/", () => {
    const path = storagePathFor(
      "image/webp",
      new Date("2026-03-05T00:00:00Z"),
      "0b1c2d3e-0000-4000-8000-000000000001",
    );
    expect(path).toBe("library/2026/03/0b1c2d3e-0000-4000-8000-000000000001.webp");
    expect(isLibraryStoragePath(path)).toBe(true);
  });

  it.each([
    "../etc/passwd",
    "library/2026/03/x.png",
    "library/2026/03/0b1c2d3e-0000-4000-8000-000000000001.html",
    "other/2026/03/0b1c2d3e-0000-4000-8000-000000000001.png",
  ])("rejects %j", (path) => {
    expect(isLibraryStoragePath(path)).toBe(false);
  });
});

describe("sniffMimeType", () => {
  it.each([
    ["sample.png", "image/png"],
    ["sample.jpg", "image/jpeg"],
    ["sample.gif", "image/gif"],
    ["sample.webp", "image/webp"],
    ["sample.avif", "image/avif"],
  ])("detects %s as %s", (name, type) => {
    expect(sniffMimeType(fixture(name))).toBe(type);
  });

  it("detects PDF and SVG", () => {
    expect(sniffMimeType(svg("%PDF-1.7\n..."))).toBe("application/pdf");
    expect(
      sniffMimeType(svg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBe("image/svg+xml");
  });

  it("does not trust a file that only claims to be an image", () => {
    expect(sniffMimeType(svg("<html><script>alert(1)</script></html>"))).toBeNull();
  });
});

describe("imageDimensions", () => {
  it.each([
    ["sample.png", "image/png"],
    ["sample.jpg", "image/jpeg"],
    ["sample.gif", "image/gif"],
    ["sample.webp", "image/webp"],
    ["sample-lossy.webp", "image/webp"],
    ["sample.avif", "image/avif"],
  ])("reads 37x21 from %s", (name, type) => {
    expect(imageDimensions(fixture(name), type)).toEqual({ width: 37, height: 21 });
  });

  it("reads SVG width/height or viewBox", () => {
    expect(imageDimensions(svg('<svg width="120" height="40px"></svg>'), "image/svg+xml")).toEqual({
      width: 120,
      height: 40,
    });
    expect(imageDimensions(svg('<svg viewBox="0 0 300 150"></svg>'), "image/svg+xml")).toEqual({
      width: 300,
      height: 150,
    });
    expect(imageDimensions(svg('<svg width="100%"></svg>'), "image/svg+xml")).toBeNull();
  });

  it("returns null for PDFs and truncated files", () => {
    expect(imageDimensions(svg("%PDF-1.7"), "application/pdf")).toBeNull();
    expect(imageDimensions(fixture("sample.png").slice(0, 10), "image/png")).toBeNull();
  });
});
