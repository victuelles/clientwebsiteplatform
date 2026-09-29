import type { Metadata, Viewport } from "next";

import { Toaster } from "@/components/ui/sonner";
import { env } from "@/core/env";
import { mediaPublicUrl } from "@/core/media/types";
import { fontVariableClassNames } from "@/core/settings/font-loaders";
import { getSiteSettings } from "@/core/settings/get-settings";
import { themeToCssVariables } from "@/core/settings/theme";

import "./globals.css";

/** Default metadata for every page, from site settings (pages add their own title). */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const image = settings.ogImage;
  return {
    metadataBase: env.NEXT_PUBLIC_SITE_URL ? new URL(env.NEXT_PUBLIC_SITE_URL) : undefined,
    title: {
      default: settings.tagline ? `${settings.siteName} | ${settings.tagline}` : settings.siteName,
      template: settings.seoTitleTemplate ?? `%s | ${settings.siteName}`,
    },
    description: settings.seoDescription ?? undefined,
    applicationName: settings.siteName,
    icons: { icon: "/brand-icon", apple: "/brand-icon" },
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      description: settings.seoDescription ?? undefined,
      images: image
        ? [
            {
              url: mediaPublicUrl(image.storage_path),
              width: image.width ?? undefined,
              height: image.height ?? undefined,
              alt: image.alt_text ?? settings.siteName,
            },
          ]
        : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary" },
    // Until launch: noindex everywhere (robots.txt disallows everything too).
    robots: settings.allowIndexing ? undefined : { index: false, follow: false },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return { themeColor: settings.theme.colors.accent };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  // The stored theme overrides the defaults in globals.css. Values are validated hex colors,
  // font variables, and a number (see src/core/settings/theme.ts), so this is safe to inline.
  const themeStyle = themeToCssVariables(settings.theme) as React.CSSProperties;

  return (
    <html lang="en" className={`${fontVariableClassNames} h-full antialiased`} style={themeStyle}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
