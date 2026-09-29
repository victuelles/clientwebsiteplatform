import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { fontVariableClassNames } from "@/core/settings/font-loaders";
import { getSiteSettings } from "@/core/settings/get-settings";
import { themeToCssVariables } from "@/core/settings/theme";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: settings.siteName,
      template: settings.seoTitleTemplate ?? `%s | ${settings.siteName}`,
    },
    description: settings.seoDescription ?? undefined,
  };
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
