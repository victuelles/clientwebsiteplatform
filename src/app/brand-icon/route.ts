import { ImageResponse } from "next/og";
import { createElement as h } from "react";

import { mediaPublicUrl } from "@/core/media/types";
import { getSiteSettings } from "@/core/settings/get-settings";

// The site favicon: the uploaded favicon asset, or a generated mark in the logo fallback style
// (accent square, skewed, with the site's first letter).
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();

  if (settings.favicon) {
    return Response.redirect(mediaPublicUrl(settings.favicon.storage_path), 302);
  }

  const { accent } = settings.theme.colors;
  const letter =
    settings.siteName
      .trim()
      .match(/[\p{L}\p{N}]/u)?.[0]
      ?.toUpperCase() ?? "•";
  const foreground = settings.theme.colors.background;

  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        },
      },
      h(
        "div",
        {
          style: {
            width: 50,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: accent,
            transform: "skewX(-12deg)",
          },
        },
        h(
          "span",
          {
            style: {
              color: foreground,
              fontSize: 44,
              fontWeight: 900,
              fontStyle: "italic",
              transform: "skewX(12deg)",
            },
          },
          letter,
        ),
      ),
    ),
    { width: 64, height: 64, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
