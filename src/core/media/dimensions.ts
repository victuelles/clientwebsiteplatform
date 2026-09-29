// Reads image dimensions from file headers without decoding the image (no dependency).

export type Dimensions = { width: number; height: number };

function png(b: Uint8Array, v: DataView): Dimensions | null {
  return b.length >= 24 ? { width: v.getUint32(16), height: v.getUint32(20) } : null;
}

function gif(b: Uint8Array, v: DataView): Dimensions | null {
  return b.length >= 10 ? { width: v.getUint16(6, true), height: v.getUint16(8, true) } : null;
}

function jpeg(b: Uint8Array, v: DataView): Dimensions | null {
  let offset = 2;
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) return null;
    const marker = b[offset + 1]!;
    // Start-of-frame markers (baseline, progressive, ...) carry the size.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: v.getUint16(offset + 5), width: v.getUint16(offset + 7) };
    }
    offset += 2 + v.getUint16(offset + 2);
  }
  return null;
}

function webp(b: Uint8Array, v: DataView): Dimensions | null {
  const chunk = String.fromCharCode(...b.slice(12, 16));
  if (chunk === "VP8 " && b.length >= 30) {
    return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  }
  if (chunk === "VP8L" && b.length >= 25) {
    const bits = v.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X" && b.length >= 30) {
    const w = b[24]! | (b[25]! << 8) | (b[26]! << 16);
    const h = b[27]! | (b[28]! << 8) | (b[29]! << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

function avif(b: Uint8Array, v: DataView): Dimensions | null {
  // The 'ispe' (image spatial extents) property: 4 bytes version/flags, then width, height.
  for (let i = 0; i + 16 < b.length; i++) {
    if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) {
      return { width: v.getUint32(i + 8), height: v.getUint32(i + 12) };
    }
  }
  return null;
}

function svg(b: Uint8Array): Dimensions | null {
  const text = new TextDecoder().decode(b.slice(0, 4096));
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;
  const attr = (name: string) =>
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
  const number = (value?: string) =>
    value && /^\d+(\.\d+)?(px)?$/.test(value) ? Math.round(parseFloat(value)) : null;
  const width = number(attr("width"));
  const height = number(attr("height"));
  if (width && height) return { width, height };
  const box = attr("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box && box.length === 4 && box[2]! > 0 && box[3]! > 0) {
    return { width: Math.round(box[2]!), height: Math.round(box[3]!) };
  }
  return null;
}

export function imageDimensions(bytes: Uint8Array, mimeType: string): Dimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    const result =
      mimeType === "image/png"
        ? png(bytes, view)
        : mimeType === "image/gif"
          ? gif(bytes, view)
          : mimeType === "image/jpeg"
            ? jpeg(bytes, view)
            : mimeType === "image/webp"
              ? webp(bytes, view)
              : mimeType === "image/avif"
                ? avif(bytes, view)
                : mimeType === "image/svg+xml"
                  ? svg(bytes)
                  : null;
    return result && result.width > 0 && result.height > 0 ? result : null;
  } catch {
    return null;
  }
}
